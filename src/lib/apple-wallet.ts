import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import { PKPass } from 'passkit-generator';
import sharp from 'sharp';

interface MerchantData {
  id: string;
  name: string;
  slug: string;
  primary_color?: string;
  stamp_symbol?: string;
  stamp_goal?: number;
  reward_text?: string;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  language?: string;
  logo_url?: string;
  push_settings?: any;
  latest_message?: { header: string; body: string; created_at?: string };
}

interface CustomerData {
  id: string;
  wallet_object_id: string;
  points: number;
  created_at?: string;
  auth_token?: string;
}

// Convert Hex color (#D4AF37) to Apple PassKit RGB string "rgb(212, 175, 55)"
export function hexToRgb(hex: string): string {
  if (!hex) return 'rgb(212, 175, 55)';
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return 'rgb(212, 175, 55)';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

export function hexToRgbRaw(hex: string): string {
  if (!hex) return '212, 175, 55';
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return '212, 175, 55';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

const DICT: Record<string, any> = {
  de: {
    stampsLabel: "STEMPEL",
    rewardLabel: "BELOHNUNG",
    customerIdLabel: "KUNDEN-ID",
    termsLabel: "TEILNAHMEBEDINGUNGEN",
    addressLabel: "ADRESSE",
    contactLabel: "KONTAKT",
    supportLabel: "DIGITALE STEMPELKARTE",
    termsText: "Zeige diese digitale Treuekarte bei jedem Besuch an der Kasse vor. Pro Einkauf/Bestellung erhältst du Stempel. Bei voller Karte wird deine Belohnung eingelöst!",
    supportText: "Bereitgestellt von Marketif (marketif.net) – Digitale Kundenkarten & Kundenbindung.",
    changeStamps: "Stempelstand aktualisiert: %@",
    changeReward: "Belohnung: %@",
  },
  fr: {
    stampsLabel: "TAMPONS",
    rewardLabel: "RÉCOMPENSE",
    customerIdLabel: "ID CLIENT",
    termsLabel: "CONDITIONS DU PROGRAMME",
    addressLabel: "ADRESSE",
    contactLabel: "CONTACT",
    supportLabel: "CARTE DE FIDÉLITÉ DIGITALE",
    termsText: "Présentez cette carte digitale à chaque passage en caisse. Cumulez des tampons et débloquez votre récompense exclusive!",
    supportText: "Propulsé par Marketif (marketif.net) – Cartes de fidélité digitales & rétention client.",
    changeStamps: "Tampons mis à jour : %@",
    changeReward: "Récompense : %@",
  }
};

export function buildPassJson(merchant: MerchantData, customer: CustomerData) {
  const lang = merchant.language === 'fr' ? 'fr' : 'de';
  const t = DICT[lang] || DICT.de;
  const stampGoal = merchant.stamp_goal || 9;
  const currentPoints = customer.points || 0;
  const rewardText = merchant.reward_text || (lang === 'fr' ? '1 Récompense Gratuite' : '1 Gratis Belohnung');

  const passTypeId = process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.de.marketif.loyalty';
  const teamId = process.env.APPLE_TEAM_ID || 'HA5ATW8338';
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://treue.marketif.de';
  const cleanAppUrl = rawAppUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  const isHttps = cleanAppUrl && cleanAppUrl.startsWith('https://');

  const shortId = (customer.wallet_object_id || customer.id).split('-')[0] || (customer.wallet_object_id || customer.id).slice(0, 8);

  return {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    serialNumber: customer.wallet_object_id || customer.id,
    teamIdentifier: teamId,
    ...(isHttps ? {
      webServiceURL: `${cleanAppUrl}/api`,
      authenticationToken: customer.auth_token || crypto.createHash('sha256').update(customer.wallet_object_id || customer.id).digest('hex'),
    } : {}),
    organizationName: merchant.name || 'Marketif Loyalty',
    description: `${merchant.name} ${lang === 'fr' ? 'Carte de Fidélité' : 'Treuekarte'}`,
    logoText: merchant.name,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(16, 14, 12)',
    labelColor: hexToRgb(merchant.primary_color || '#D4AF37'),
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: customer.wallet_object_id || customer.id,
        messageEncoding: 'iso-8859-1',
        altText: shortId,
      }
    ],
    storeCard: {
      headerFields: [
        {
          key: 'points_header',
          label: t.stampsLabel,
          value: `${currentPoints} / ${stampGoal}`,
          textAlignment: 'PKTextAlignmentRight',
          changeMessage: t.changeStamps
        }
      ],
      // No primaryFields: leaves the main front card body fully open for strip.png banner
      primaryFields: [],
      secondaryFields: [
        {
          key: 'reward',
          label: t.rewardLabel,
          value: rewardText,
          changeMessage: t.changeReward
        }
      ],
      auxiliaryFields: [
        {
          key: 'customer_id',
          label: t.customerIdLabel,
          value: shortId
        }
      ],
      backFields: [
        ...(merchant.latest_message ? [{
          key: 'latest_message',
          label: lang === 'fr' ? 'MESSAGE / OFFRE' : 'AKTUELLE NACHRICHT',
          value: `${merchant.latest_message.header}\n\n${merchant.latest_message.body}`,
          changeMessage: '%@'
        }] : []),
        {
          key: 'reward_detail',
          label: t.rewardLabel,
          value: rewardText
        },
        {
          key: 'terms',
          label: t.termsLabel,
          value: t.termsText
        },
        ...(merchant.address ? [{
          key: 'address',
          label: t.addressLabel,
          value: merchant.address
        }] : []),
        ...(merchant.contact_phone ? [{
          key: 'phone',
          label: t.contactLabel,
          value: merchant.contact_phone
        }] : []),
        {
          key: 'support',
          label: t.supportLabel,
          value: t.supportText
        }
      ]
    }
  };
}

function cleanEnv(val?: string): string {
  if (!val) return '';
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function parsePem(pemStr?: string): string {
  if (!pemStr) return '';
  let cleaned = cleanEnv(pemStr);
  if (cleaned.includes('\\n')) {
    cleaned = cleaned.replace(/\\n/g, '\n');
  }
  return cleaned;
}

let cachedSigner: { signerCert: string; signerKey: string; wwdr: string } | null = null;

function getSignerCredentials() {
  if (cachedSigner) return cachedSigner;

  const directCertPem = parsePem(process.env.APPLE_PASS_SIGNER_CERT_PEM);
  const directKeyPem = parsePem(process.env.APPLE_PASS_SIGNER_KEY_PEM);
  const wwdrPem = parsePem(process.env.APPLE_WWDR_CERT_PEM);

  // 1. If direct PEM credentials are provided, use them directly
  if (directCertPem && directKeyPem) {
    cachedSigner = {
      signerCert: directCertPem,
      signerKey: directKeyPem,
      wwdr: wwdrPem
    };
    return cachedSigner;
  }

  // 2. Fallback to P12 Base64
  const p12Base64 = cleanEnv(process.env.APPLE_PASS_CERT_P12_BASE64);
  const p12Password = cleanEnv(process.env.APPLE_PASS_CERT_PASSWORD);

  if (!p12Base64) {
    throw new Error('Apple Wallet credentials missing. Please set APPLE_PASS_SIGNER_CERT_PEM and APPLE_PASS_SIGNER_KEY_PEM.');
  }

  const sanitizedBase64 = p12Base64.replace(/\s+/g, '');
  const p12Der = Buffer.from(sanitizedBase64, 'base64').toString('binary');
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);

  let signerCertPem: string | null = null;
  let signerKeyPem: string | null = null;

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.certBag) {
        const c = safeBag.cert;
        const cnAttr = c?.subject?.attributes?.find((a: any) => a.name === 'commonName' || a.shortName === 'CN');
        if (cnAttr && (cnAttr.value.includes('pass.') || cnAttr.value.includes('Pass Type ID'))) {
          signerCertPem = forge.pki.certificateToPem(c);
        } else if (!signerCertPem) {
          signerCertPem = forge.pki.certificateToPem(c);
        }
      } else if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag || safeBag.type === forge.pki.oids.keyBag) {
        signerKeyPem = forge.pki.privateKeyToPem(safeBag.key);
      }
    }
  }

  if (!signerCertPem || !signerKeyPem) {
    throw new Error('Failed to extract Apple Wallet signer certificate or private key from P12 bundle');
  }

  cachedSigner = {
    signerCert: signerCertPem,
    signerKey: signerKeyPem,
    wwdr: wwdrPem
  };

  return cachedSigner;
}

async function loadBuffer(source?: string): Promise<Buffer | null> {
  if (!source) return null;
  try {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const res = await fetch(source, { cache: 'no-store' });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        return Buffer.from(arr);
      }
    } else if (source.startsWith('data:image/')) {
      const base64Data = source.split(',')[1];
      if (base64Data) return Buffer.from(base64Data, 'base64');
    } else if (fs.existsSync(source)) {
      return fs.readFileSync(source);
    }
  } catch (e) {
    console.warn('[Apple Wallet] Could not load image buffer:', source, e);
  }
  return null;
}

// In-memory cache for Twemoji SVGs to ensure ultra-fast image generation
const twemojiCache = new Map<string, string>();

function emojiToTwemojiHex(emoji: string): string {
  const codePoints: string[] = [];
  for (let i = 0; i < emoji.length; i++) {
    const cp = emoji.codePointAt(i);
    if (cp !== undefined) {
      if (cp > 0xffff) i++;
      // Exclude emoji variation selector-16 (fe0f) if standalone to maximize CDN hit
      codePoints.push(cp.toString(16).toLowerCase());
    }
  }
  return codePoints.join('-');
}

async function fetchTwemojiBase64(emoji: string): Promise<string | null> {
  if (!emoji) return null;
  if (twemojiCache.has(emoji)) {
    return twemojiCache.get(emoji)!;
  }

  try {
    const hex = emojiToTwemojiHex(emoji);
    const urls = [
      `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${hex}.svg`,
      `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${hex}.svg`,
    ];

    // Also try without -fe0f if present
    const simplifiedHex = hex.replace(/-fe0f/g, '');
    if (simplifiedHex !== hex) {
      urls.push(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${simplifiedHex}.svg`);
    }

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (res.ok) {
          const text = await res.text();
          const base64 = `data:image/svg+xml;base64,${Buffer.from(text).toString('base64')}`;
          twemojiCache.set(emoji, base64);
          return base64;
        }
      } catch {
        // Try next URL
      }
    }
  } catch (e) {
    console.warn('[Apple Wallet] Twemoji fetch error:', e);
  }
  return null;
}

function getStarPolygon(cx: number, cy: number, r: number, fill: string, stroke?: string): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = (i % 2 === 0) ? r : r * 0.44;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return `<polygon points="${points.join(' ')}" fill="${fill}" stroke="${stroke || 'none'}" stroke-width="1.5" />`;
}

/**
 * Generates the Apple Wallet Strip Banner (1125 x 369)
 * 1:1 identical to Google Wallet card design with custom Emojis, cover photo, glowing circles
 */
async function generateStripSvg(
  points: number,
  stampGoal: number,
  stampSymbol: string,
  primaryColor?: string,
  language?: string,
  rewardText?: string,
  heroImageBase64?: string | null
): Promise<string> {
  const width = 1125;
  const height = 369;
  const gold = primaryColor || '#D4AF37';
  const rgb = hexToRgbRaw(gold);
  const isFrench = language === 'fr';
  const isFull = points >= stampGoal;

  const bgImageTag = heroImageBase64
    ? `<image href="data:image/png;base64,${heroImageBase64}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity="0.65" />`
    : '';

  // 1. REWARD READY STATE (Pass is full)
  if (isFull) {
    const title = isFrench ? 'FÉLICITATIONS !' : 'HERZLICHEN GLÜCKWUNSCH !';
    const sub = isFrench ? 'Présentez cette carte lors de votre prochaine visite' : 'Zeige diese Karte beim nächsten Besuch vor';
    const displayReward = rewardText || (isFrench ? 'Récompense prête' : 'Belohnung bereit');

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgFull" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1E170A" />
            <stop offset="50%" stop-color="#0E0C08" />
            <stop offset="100%" stop-color="#1E170A" />
          </linearGradient>
          <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFF5B8" />
            <stop offset="50%" stop-color="${gold}" />
            <stop offset="100%" stop-color="#E5A800" />
          </linearGradient>
          <radialGradient id="glowEffect" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(${rgb}, 0.25)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#bgFull)" />
        ${bgImageTag}
        <rect width="${width}" height="${height}" fill="rgba(0,0,0,0.45)" />
        <rect width="${width}" height="${height}" fill="url(#glowEffect)" />
        <line x1="0" y1="0" x2="${width}" y2="0" stroke="${gold}" stroke-width="6" opacity="0.95" />
        <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="${gold}" stroke-width="6" opacity="0.95" />
        <rect x="40" y="24" width="1045" height="321" rx="24" fill="rgba(0,0,0,0.65)" stroke="${gold}" stroke-width="2.5" stroke-dasharray="8,6" />
        <text x="${width / 2}" y="115" font-size="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" fill="url(#goldText)" letter-spacing="3">★ ${title} ★</text>
        <text x="${width / 2}" y="190" font-size="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" text-anchor="middle" fill="#FFFFFF">${displayReward}</text>
        <text x="${width / 2}" y="260" font-size="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" text-anchor="middle" fill="#E0E0E0" opacity="0.9">${sub}</text>
      </svg>
    `;
  }

  // 2. STAMP COLLECTING STATE (Matching Google Wallet stamp grid)
  const twemojiDataUrl = await fetchTwemojiBase64(stampSymbol || '✨');

  // Calculate dynamic grid
  const colsPerRow = stampGoal <= 5 ? stampGoal : (stampGoal <= 10 ? Math.ceil(stampGoal / 2) : 6);
  const rows = Math.ceil(stampGoal / colsPerRow);
  
  // Dimensions tailored for 1125x369 strip canvas
  const size = rows === 1 ? 116 : (rows === 2 ? (stampGoal > 10 ? 76 : 88) : 68);
  const gap = rows === 1 ? 28 : (rows === 2 ? 18 : 12);
  const iconSize = size * 0.58;

  let circlesSvg = '';

  for (let i = 0; i < stampGoal; i++) {
    const row = Math.floor(i / colsPerRow);
    const col = i % colsPerRow;
    const totalInRow = (row === rows - 1) ? (stampGoal - row * colsPerRow) : colsPerRow;
    const startX = (width - (totalInRow * size + (totalInRow - 1) * gap)) / 2;
    const startY = (height - (rows * size + (rows - 1) * gap)) / 2;

    const cx = startX + col * (size + gap) + size / 2;
    const cy = startY + row * (size + gap) + size / 2;
    const r = size / 2;
    const isStamped = i < points;
    const iconX = cx - iconSize / 2;
    const iconY = cy - iconSize / 2;

    if (isStamped) {
      circlesSvg += `
        <g>
          <!-- Outer Stamp Glow -->
          <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="rgba(${rgb}, 0.25)" />
          <!-- Stamp Gradient Body -->
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#goldGrad)" stroke="${gold}" stroke-width="3.5" />
          <!-- Inner Rim -->
          <circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          ${
            twemojiDataUrl
              ? `<image href="${twemojiDataUrl}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" />`
              : getStarPolygon(cx, cy, r * 0.58, '#14120D', 'rgba(255,255,255,0.4)')
          }
        </g>
      `;
    } else {
      circlesSvg += `
        <g>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(0,0,0,0.55)" stroke="rgba(${rgb}, 0.45)" stroke-width="2.5" stroke-dasharray="6,6" />
          ${
            twemojiDataUrl
              ? `<image href="${twemojiDataUrl}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" opacity="0.22" />`
              : getStarPolygon(cx, cy, r * 0.42, `rgba(${rgb}, 0.25)`)
          }
        </g>
      `;
    }
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#181510" />
          <stop offset="50%" stop-color="#0A0907" />
          <stop offset="100%" stop-color="#14110B" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF2B2" />
          <stop offset="45%" stop-color="${gold}" />
          <stop offset="100%" stop-color="#8C6200" />
        </linearGradient>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(${rgb}, 0.18)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
      ${bgImageTag}
      <rect width="${width}" height="${height}" fill="url(#centerGlow)" />
      <line x1="0" y1="0" x2="${width}" y2="0" stroke="${gold}" stroke-width="4.5" opacity="0.9" />
      <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="${gold}" stroke-width="4.5" opacity="0.9" />
      ${circlesSvg}
    </svg>
  `;
}

/**
 * Creates the in-memory .pkpass ZIP archive with passkit-generator
 */
export async function generatePkPass(merchant: MerchantData, customer: CustomerData): Promise<Buffer> {
  const credentials = getSignerCredentials();

  // If latest_message is not set, attempt to fetch it from database
  if (!merchant.latest_message && merchant.id) {
    try {
      const { getAdminSupabase } = require('./supabase');
      const adminSupabase = getAdminSupabase();
      const { data: latestMsg } = await adminSupabase
        .from('messages_loyality')
        .select('header, body, created_at')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (latestMsg) {
        merchant.latest_message = latestMsg;
      }
    } catch {
      // Ignore
    }
  }

  const passJson = buildPassJson(merchant, customer);
  const passJsonBuffer = Buffer.from(JSON.stringify(passJson, null, 2), 'utf8');

  // Prepare images with Sharp
  const publicDir = path.join(process.cwd(), 'public');
  const iconPath = path.join(publicDir, 'icon-192x192.png');
  const defaultLogoPath = path.join(publicDir, 'Marketif_LOGO_Symbol.png');

  const defaultIcon = fs.existsSync(iconPath) ? fs.readFileSync(iconPath) : null;
  const defaultLogo = fs.existsSync(defaultLogoPath) ? fs.readFileSync(defaultLogoPath) : null;

  // 1. Try to load merchant custom logo
  const merchantLogoBuffer = await loadBuffer(merchant.logo_url);
  const logoSource = merchantLogoBuffer || defaultLogo;
  const iconSource = merchantLogoBuffer || defaultIcon || logoSource;

  // 2. Try to load merchant hero cover image
  const heroImageBuffer = await loadBuffer(merchant.push_settings?.hero_image);
  let heroImageBase64: string | null = null;
  if (heroImageBuffer) {
    try {
      const resizedHero = await sharp(heroImageBuffer).resize(1125, 369, { fit: 'cover' }).png().toBuffer();
      heroImageBase64 = resizedHero.toString('base64');
    } catch (e) {
      console.warn('[Apple Wallet] Could not resize hero cover image:', e);
    }
  }

  const buffersMap: Record<string, Buffer> = {
    'pass.json': passJsonBuffer
  };

  if (iconSource) {
    const [icon1x, icon2x, icon3x] = await Promise.all([
      sharp(iconSource).resize(29, 29).png().toBuffer(),
      sharp(iconSource).resize(58, 58).png().toBuffer(),
      sharp(iconSource).resize(87, 87).png().toBuffer()
    ]);
    buffersMap['icon.png'] = icon1x;
    buffersMap['icon@2x.png'] = icon2x;
    buffersMap['icon@3x.png'] = icon3x;
  }

  if (logoSource) {
    const [logo1x, logo2x, logo3x] = await Promise.all([
      sharp(logoSource).resize({ width: 160, height: 50, fit: 'inside' }).png().toBuffer(),
      sharp(logoSource).resize({ width: 320, height: 100, fit: 'inside' }).png().toBuffer(),
      sharp(logoSource).resize({ width: 480, height: 150, fit: 'inside' }).png().toBuffer()
    ]);
    buffersMap['logo.png'] = logo1x;
    buffersMap['logo@2x.png'] = logo2x;
    buffersMap['logo@3x.png'] = logo3x;
  }

  // Generate dynamic strip banner with stamp circles & emojis (matching Google Wallet design)
  const stampGoal = merchant.stamp_goal || 9;
  const currentPoints = customer.points || 0;
  const stampSymbol = merchant.stamp_symbol || '✨';
  const rewardText = merchant.reward_text || (merchant.language === 'fr' ? '1 Récompense Gratuite' : '1 Gratis Belohnung');

  const stripSvg = await generateStripSvg(
    currentPoints,
    stampGoal,
    stampSymbol,
    merchant.primary_color,
    merchant.language,
    rewardText,
    heroImageBase64
  );
  const stripSvgBuffer = Buffer.from(stripSvg, 'utf8');

  const [strip1x, strip2x, strip3x] = await Promise.all([
    sharp(stripSvgBuffer).resize(375, 123).png().toBuffer(),
    sharp(stripSvgBuffer).resize(750, 246).png().toBuffer(),
    sharp(stripSvgBuffer).resize(1125, 369).png().toBuffer(),
  ]);

  buffersMap['strip.png'] = strip1x;
  buffersMap['strip@2x.png'] = strip2x;
  buffersMap['strip@3x.png'] = strip3x;

  const pass = new PKPass(buffersMap, credentials);
  return pass.getAsBuffer();
}
