import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const subdomain = process.argv[2] || 'o205658-f7a';
const sourceKbUrl = `https://${subdomain}.octadesk.com/kb/`;
const kbBase = 'https://southamerica-east1-004.prod.octadesk.services/knowledgebase';
const outputDir = process.argv[3] || path.join(__dirname, 'output', 'latest');

const requestHeaders = {
  AppSubdomain: subdomain,
};

function toForwardSlashes(value) {
  return value.split(path.sep).join('/');
}

function slugifySegment(value, fallback = 'item') {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || fallback;
}

function padOrder(value) {
  const number = Number.isFinite(Number(value)) ? Number(value) : 0;
  return String(number).padStart(3, '0');
}

function htmlToText(html) {
  const blockBreaks = /<(\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|br\s*\/?)>/gi;
  let text = String(html || '')
    .replace(blockBreaks, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));

  const namedEntities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };

  for (const [entity, replacement] of Object.entries(namedEntities)) {
    text = text.split(entity).join(replacement);
  }

  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractAssetUrls(html) {
  const matches = [
    ...String(html || '').matchAll(/(?:src|href)="([^"]+)"/gi),
  ];

  return [
    ...new Set(
      matches
        .map((match) => match[1])
        .filter((url) => /^https?:\/\//i.test(url))
        .filter((url) => url.includes('storage.googleapis.com')),
    ),
  ];
}

function deriveAssetRelativePath(assetUrl) {
  const parsed = new URL(assetUrl);
  const pathname = parsed.pathname.replace(/^\/+/, '');
  const pieces = pathname.split('/').map((piece) => slugifySegment(piece, 'asset'));
  return path.join('assets', ...pieces);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function fetchJson(relativePath) {
  const url = new URL(relativePath.replace(/^\/+/, ''), `${kbBase}/`);
  const response = await fetch(url, {
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function downloadAsset(assetUrl, relativePath) {
  const response = await fetch(assetUrl);

  if (!response.ok) {
    throw new Error(`GET ${assetUrl} -> ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const assetPath = path.join(outputDir, relativePath);

  await ensureDir(path.dirname(assetPath));
  await fs.writeFile(assetPath, buffer);

  return {
    sourceUrl: assetUrl,
    relativePath,
    sizeBytes: buffer.length,
    contentType: response.headers.get('content-type') || null,
  };
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function consume() {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => consume());
  await Promise.all(workers);
  return results;
}

async function main() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await ensureDir(outputDir);

  const generatedAt = new Date().toISOString();
  const categories = await fetchJson('categories');
  const board = await fetchJson('kbboard/home');
  const categoryByUrl = new Map(categories.map((category) => [category.url, category]));

  const sectionRecords = [];
  const articleRecords = [];
  const assetUsage = new Map();

  for (const boardCategory of board.categories) {
    const categoryMeta = categoryByUrl.get(boardCategory.url) || boardCategory;

    for (const boardSection of boardCategory.sections) {
      const sectionMeta = await fetchJson(`sections/${boardSection.url}`);
      const articles = await fetchJson(`articles/section/${sectionMeta.sectionId}`);

      const categorySlug = slugifySegment(categoryMeta.url || categoryMeta.title, 'category');
      const sectionSlug = slugifySegment(sectionMeta.url || sectionMeta.title, 'section');

      sectionRecords.push({
        categoryId: categoryMeta.categoryId,
        categoryTitle: categoryMeta.title,
        categoryUrl: categoryMeta.url,
        sectionId: sectionMeta.sectionId,
        sectionTitle: sectionMeta.title,
        sectionUrl: sectionMeta.url,
        sectionDescription: sectionMeta.description || '',
        articleCount: articles.length,
        outputPath: toForwardSlashes(path.join('sections', categorySlug, `${sectionSlug}.json`)),
      });

      for (const article of [...articles].sort((left, right) => (left.orderId ?? 0) - (right.orderId ?? 0))) {
        const assetUrls = extractAssetUrls(article.content);
        const articleSlug = slugifySegment(article.url || article.title, 'article');
        const articleDirRelative = path.join(
          'articles',
          categorySlug,
          sectionSlug,
          `${padOrder(article.orderId)}-${articleSlug}`,
        );
        const plainText = htmlToText(article.content);

        for (const assetUrl of assetUrls) {
          if (!assetUsage.has(assetUrl)) {
            assetUsage.set(assetUrl, {
              sourceUrl: assetUrl,
              relativePath: deriveAssetRelativePath(assetUrl),
              usedBy: [],
            });
          }

          assetUsage.get(assetUrl).usedBy.push({
            articleId: article.articleId,
            articleSlug,
          });
        }

        articleRecords.push({
          id: article.id,
          articleId: article.articleId,
          title: article.title,
          url: article.url,
          status: article.status,
          orderId: article.orderId ?? 0,
          categoryId: categoryMeta.categoryId,
          categoryTitle: categoryMeta.title,
          categoryUrl: categoryMeta.url,
          sectionId: sectionMeta.sectionId,
          sectionTitle: sectionMeta.title,
          sectionUrl: sectionMeta.url,
          createdBy: article.createdBy || null,
          updatedBy: article.updatedBy || null,
          lastPublishedBy: article.lastPublishedBy || null,
          permission: article.permission || [],
          assetUrls,
          plainText,
          contentHtml: article.content,
          articleDirRelative: toForwardSlashes(articleDirRelative),
        });
      }
    }
  }

  const assets = await runWithConcurrency(
    [...assetUsage.values()],
    8,
    async (asset) => {
      try {
        return await downloadAsset(asset.sourceUrl, asset.relativePath);
      } catch (error) {
        return {
          sourceUrl: asset.sourceUrl,
          relativePath: asset.relativePath,
          sizeBytes: 0,
          contentType: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  const downloadedAssetByUrl = new Map(assets.map((asset) => [asset.sourceUrl, asset]));

  for (const category of categories) {
    const categorySlug = slugifySegment(category.url || category.title, 'category');
    await writeJson(
      path.join(outputDir, 'categories', `${categorySlug}.json`),
      {
        ...category,
        sections: sectionRecords.filter((section) => section.categoryId === category.categoryId),
      },
    );
  }

  for (const section of sectionRecords) {
    await writeJson(path.join(outputDir, section.outputPath), section);
  }

  for (const article of articleRecords) {
    const articleDir = path.join(outputDir, article.articleDirRelative);
    const assetsForArticle = article.assetUrls.map((assetUrl) => {
      const asset = downloadedAssetByUrl.get(assetUrl);
      return {
        sourceUrl: assetUrl,
        localPath: asset ? asset.relativePath : null,
        contentType: asset?.contentType || null,
        sizeBytes: asset?.sizeBytes || 0,
        error: asset?.error || null,
      };
    });

    let localContentHtml = article.contentHtml;

    for (const asset of assetsForArticle) {
      if (!asset.localPath) {
        continue;
      }

      const relativeAssetPath = toForwardSlashes(path.relative(articleDir, path.join(outputDir, asset.localPath)));
      localContentHtml = localContentHtml.split(asset.sourceUrl).join(relativeAssetPath);
    }

    await writeJson(path.join(articleDir, 'article.json'), {
      ...article,
      assets: assetsForArticle,
    });
    await writeText(path.join(articleDir, 'content.raw.html'), `${article.contentHtml}\n`);
    await writeText(path.join(articleDir, 'content.local.html'), `${localContentHtml}\n`);
    await writeText(path.join(articleDir, 'content.txt'), `${article.plainText}\n`);
  }

  const manifest = {
    generatedAt,
    sourceKbUrl,
    subdomain,
    counts: {
      categories: categories.length,
      sections: sectionRecords.length,
      articles: articleRecords.length,
      assets: assets.length,
    },
    categories: categories.map((category) => ({
      categoryId: category.categoryId,
      title: category.title,
      url: category.url,
      description: category.description || '',
      sectionCount: sectionRecords.filter((section) => section.categoryId === category.categoryId).length,
      articleCount: articleRecords.filter((article) => article.categoryId === category.categoryId).length,
    })),
  };

  const articleIndex = articleRecords.map((article) => ({
    articleId: article.articleId,
    title: article.title,
    url: article.url,
    categoryTitle: article.categoryTitle,
    categoryUrl: article.categoryUrl,
    sectionTitle: article.sectionTitle,
    sectionUrl: article.sectionUrl,
    orderId: article.orderId,
    assetCount: article.assetUrls.length,
    articleDirRelative: article.articleDirRelative,
    plainTextPreview: article.plainText.slice(0, 280),
  }));

  const bundle = {
    generatedAt,
    sourceKbUrl,
    subdomain,
    manifest,
    sections: sectionRecords,
    articles: articleRecords.map((article) => ({
      ...article,
      assets: article.assetUrls.map((assetUrl) => ({
        sourceUrl: assetUrl,
        localPath: downloadedAssetByUrl.get(assetUrl)?.relativePath || null,
      })),
    })),
  };

  const summaryLines = [
    '# Export Summary',
    '',
    `- Fonte: ${sourceKbUrl}`,
    `- Gerado em: ${generatedAt}`,
    `- Categorias: ${manifest.counts.categories}`,
    `- Seções: ${manifest.counts.sections}`,
    `- Artigos: ${manifest.counts.articles}`,
    `- Assets: ${manifest.counts.assets}`,
    '',
    '## Estrutura',
    '',
    '- `manifest.json`: resumo geral da exportação',
    '- `bundle.json`: pacote único com categorias, seções e artigos completos',
    '- `articles-index.json`: índice leve para busca/importação',
    '- `categories/` e `sections/`: metadados organizados',
    '- `articles/`: um diretório por artigo com HTML bruto, HTML com paths locais, texto puro e JSON',
    '- `assets/`: imagens/arquivos baixados do conteúdo',
    '',
    '## Categorias',
    '',
    ...manifest.categories.map(
      (category) =>
        `- ${category.title}: ${category.sectionCount} seção(ões), ${category.articleCount} artigo(s)`,
    ),
  ];

  await writeJson(path.join(outputDir, 'manifest.json'), manifest);
  await writeJson(path.join(outputDir, 'articles-index.json'), articleIndex);
  await writeJson(path.join(outputDir, 'sections.json'), sectionRecords);
  await writeJson(path.join(outputDir, 'assets.json'), assets);
  await writeJson(path.join(outputDir, 'bundle.json'), bundle);
  await writeText(path.join(outputDir, 'SUMMARY.md'), `${summaryLines.join('\n')}\n`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        outputDir,
        sourceKbUrl,
        counts: manifest.counts,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
