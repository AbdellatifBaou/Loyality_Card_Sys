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
  stamp_goal?: number;
  reward_text?: string;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  language?: string;
  logo_url?: string;
  push_settings?: any;
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

const DICT: Record<string, any> = {
  de: {
    stampsLabel: "STEMPEL",
    statusLabel: "STATUS",
    rewardLabel: "BELOHNUNG",
    customerIdLabel: "KUNDEN-ID",
    termsLabel: "TEILNAHMEBEDINGUNGEN",
    addressLabel: "ADRESSE",
    contactLabel: "KONTAKT",
    supportLabel: "DIGITALE STEMPELKARTE",
    termsText: "Zeige diese digitale Treuekarte bei jedem Besuch an der Kasse vor. Pro Einkauf/Bestellung erhältst du Stempel. Bei voller Karte wird deine Belohnung eingelöst!",
    supportText: "Bereitgestellt von Marketif (marketif.net) – Digitale Kundenkarten & Kundenbindung.",
    almostDone: "Fast geschafft! Noch 1 Stempel 🎉",
    rewardReady: "BELOHNUNG BEREIT! 🎉",
    collecting: "Fleißig sammeln 🚀",
  },
  fr: {
    stampsLabel: "TAMPONS",
    statusLabel: "STATUT",
    rewardLabel: "RÉCOMPENSE",
    customerIdLabel: "ID CLIENT",
    termsLabel: "CONDITIONS DU PROGRAMME",
    addressLabel: "ADRESSE",
    contactLabel: "CONTACT",
    supportLabel: "CARTE DE FIDÉLITÉ DIGITALE",
    termsText: "Présentez cette carte digitale à chaque passage en caisse. Cumulez des tampons et débloquez votre récompense exclusive!",
    supportText: "Propulsé par Marketif (marketif.net) – Cartes de fidélité digitales & rétention client.",
    almostDone: "Presque prêt! Plus qu'1 tampon 🎉",
    rewardReady: "RÉCOMPENSE PRÊTE! 🎉",
    collecting: "En cours de collecte 🚀",
  }
};

export function buildPassJson(merchant: MerchantData, customer: CustomerData) {
  const lang = merchant.language === 'fr' ? 'fr' : 'de';
  const t = DICT[lang] || DICT.de;
  const stampGoal = merchant.stamp_goal || 9;
  const currentPoints = customer.points || 0;
  const rewardText = merchant.reward_text || (lang === 'fr' ? '1 Récompense Gratuite' : '1 Gratis Belohnung');

  let statusText = t.collecting;
  if (currentPoints >= stampGoal) {
    statusText = t.rewardReady;
  } else if (currentPoints === stampGoal - 1) {
    statusText = t.almostDone;
  }

  const passTypeId = process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.de.marketif.loyalty';
  const teamId = process.env.APPLE_TEAM_ID || 'HA5ATW8338';
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://treue.marketif.de';
  const cleanAppUrl = rawAppUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  const isHttps = cleanAppUrl && cleanAppUrl.startsWith('https://');

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
        altText: customer.wallet_object_id || customer.id,
      }
    ],
    storeCard: {
      headerFields: [
        {
          key: 'points_header',
          label: t.stampsLabel,
          value: `${currentPoints} / ${stampGoal}`,
          textAlignment: 'PKTextAlignmentRight'
        }
      ],
      primaryFields: [
        {
          key: 'status',
          label: t.statusLabel,
          value: statusText
        }
      ],
      secondaryFields: [
        {
          key: 'reward',
          label: t.rewardLabel,
          value: rewardText
        }
      ],
      auxiliaryFields: [
        {
          key: 'customer_id',
          label: t.customerIdLabel,
          value: customer.wallet_object_id || customer.id
        }
      ],
      backFields: [
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

  // 1. If direct PEM credentials are provided, use them directly (zero password/decoding issues)
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
    throw new Error('Apple Wallet credentials missing. Please set APPLE_PASS_SIGNER_CERT_PEM and APPLE_PASS_SIGNER_KEY_PEM (or APPLE_PASS_CERT_P12_BASE64).');
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

function getStarPolygon(cx: number, cy: number, r: number, fill: string, stroke?: string): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = (i % 2 === 0) ? r : r * 0.44;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return `<polygon points="${points.join(' ')}" fill="${fill}" stroke="${stroke || 'none'}" stroke-width="1" />`;
}

function generateStripSvg(points: number, stampGoal: number, primaryColor?: string, stampSymbol?: string, language?: string) {
  const width = 1125;
  const height = 369;
  const gold = primaryColor || '#D4AF37';
  const isFrench = language === 'fr';

  const isFull = points >= stampGoal;

  if (isFull) {
    const title = isFrench ? 'RÉCOMPENSE PRÊTE !' : 'BELOHNUNG BEREIT !';
    const sub = isFrench ? 'Présentez votre carte en caisse' : 'Zeige deine Karte an der Kasse vor';
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgFull" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#241B08" />
            <stop offset="50%" stop-color="#0E0B03" />
            <stop offset="100%" stop-color="#241B08" />
          </linearGradient>
          <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFF0A0" />
            <stop offset="50%" stop-color="${gold}" />
            <stop offset="100%" stop-color="#FFA000" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#bgFull)" />
        <line x1="0" y1="0" x2="${width}" y2="0" stroke="${gold}" stroke-width="6" opacity="0.9" />
        <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="${gold}" stroke-width="6" opacity="0.9" />
        <rect x="40" y="30" width="1045" height="309" rx="24" fill="rgba(212,175,55,0.08)" stroke="${gold}" stroke-width="2.5" stroke-dasharray="8,6" />
        <text x="${width / 2}" y="155" font-size="54" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" fill="url(#goldText)" letter-spacing="3">★ ${title} ★</text>
        <text x="${width / 2}" y="230" font-size="34" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" text-anchor="middle" fill="#FFFFFF" opacity="0.95">${sub}</text>
      </svg>
    `;
  }

  const colsPerRow = stampGoal > 10 ? 6 : (stampGoal > 5 ? 5 : stampGoal);
  const rows = Math.ceil(stampGoal / colsPerRow);
  const size = rows > 2 ? 80 : 102;
  const gap = rows > 2 ? 18 : 24;

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

    if (isStamped) {
      circlesSvg += `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#goldGrad)" stroke="${gold}" stroke-width="3.5" />
        <circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" />
        ${getStarPolygon(cx, cy, r * 0.58, '#14120D', 'rgba(255,255,255,0.3)')}
      `;
    } else {
      circlesSvg += `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.28)" stroke-width="2.5" stroke-dasharray="6,6" />
        ${getStarPolygon(cx, cy, r * 0.42, 'rgba(255,255,255,0.2)')}
      `;
    }
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1C1914" />
          <stop offset="50%" stop-color="#0E0C0A" />
          <stop offset="100%" stop-color="#1C1914" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF2B2" />
          <stop offset="45%" stop-color="${gold}" />
          <stop offset="100%" stop-color="#8C6200" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
      <line x1="0" y1="0" x2="${width}" y2="0" stroke="${gold}" stroke-width="4" opacity="0.8" />
      <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="${gold}" stroke-width="4" opacity="0.8" />
      ${circlesSvg}
    </svg>
  `;
}

/**
 * Creates the in-memory .pkpass ZIP archive with passkit-generator
 */
export async function generatePkPass(merchant: MerchantData, customer: CustomerData): Promise<Buffer> {
  const credentials = getSignerCredentials();
  const passJson = buildPassJson(merchant, customer);
  const passJsonBuffer = Buffer.from(JSON.stringify(passJson, null, 2), 'utf8');

  // Prepare images with Sharp
  const publicDir = path.join(process.cwd(), 'public');
  const iconPath = path.join(publicDir, 'icon-192x192.png');
  const defaultLogoPath = path.join(publicDir, 'Marketif_LOGO_Symbol.png');

  const iconSource = fs.existsSync(iconPath) ? fs.readFileSync(iconPath) : null;
  const logoSource = fs.existsSync(defaultLogoPath) ? fs.readFileSync(defaultLogoPath) : null;

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

  // Generate dynamic strip banner with stamp circles (matching Google Wallet design)
  const stampGoal = merchant.stamp_goal || 9;
  const currentPoints = customer.points || 0;
  const stampSymbol = (merchant as any).stamp_symbol || '★';
  const stripSvg = generateStripSvg(currentPoints, stampGoal, merchant.primary_color, stampSymbol, merchant.language);
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
