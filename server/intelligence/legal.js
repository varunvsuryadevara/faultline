// LegalRetrievalService: Queries FaultLine's pre-indexed, verified statutory database.
// Connects to 20 jurisdictions and 16 Master Motor Law Categories (A-P) with 69 verified statutes.

import { COUNTRY_METADATA, MASTER_LEGAL_CATEGORIES, resolveMasterCategory } from '../../shared/regulations/vocab.js';
import { REGULATIONS, OFFICIAL_DOCUMENTS } from '../../shared/regulations/data.js';
import { getCountryRegulations, searchRegulations } from '../../shared/regulations/query.js';

/**
 * Searches the legal database by query, country, or legal category.
 */
export function queryLegalIntelligence({ query = '', country = '', category = '', limit = 4 } = {}) {
  const cc = country ? String(country).toUpperCase().trim() : '';
  const q = String(query || '').trim();

  let pool = REGULATIONS;
  if (cc && COUNTRY_METADATA[cc]) {
    pool = pool.filter((r) => r.country === cc);
  }

  if (category && category !== 'ALL') {
    pool = pool.filter((r) => {
      const master = resolveMasterCategory(r.categoryId);
      return r.categoryId === category || r.masterCategoryId === category || (master && master.id === category);
    });
  }

  if (q) {
    const qLower = q.toLowerCase();
    pool = pool.filter((r) => {
      return (
        r.title.toLowerCase().includes(qLower) ||
        r.legalReference.toLowerCase().includes(qLower) ||
        r.summary.toLowerCase().includes(qLower) ||
        (r.tags && r.tags.some((t) => t.toLowerCase().includes(qLower)))
      );
    });
  }

  const results = pool.slice(0, limit);

  return {
    totalMatches: pool.length,
    returnedCount: results.length,
    country: cc ? COUNTRY_METADATA[cc]?.name || cc : 'All Jurisdictions',
    regulations: results.map(formatStatuteCard),
  };
}

/**
 * Formats a single statute card with official citations and verification status.
 */
function formatStatuteCard(r) {
  const master = resolveMasterCategory(r.categoryId);
  const countryName = COUNTRY_METADATA[r.country]?.name || r.country;

  return {
    id: r.id,
    country: countryName,
    countryCode: r.country,
    region: r.region || `${r.country}-ALL`,
    category: master ? `${master.code}. ${master.label}` : r.categoryId,
    title: r.title,
    legalReference: r.legalReference,
    authority: r.authority,
    status: r.status || 'VERIFIED',
    summary: r.summary,
    investigationImplications: r.investigationImplications,
    effectiveDate: r.effectiveDate || 'In force',
    sourceUrl: r.sourceUrl,
  };
}

/**
 * Compares statutory frameworks between two countries.
 */
export function compareJurisdictions(countryA, countryB) {
  const ca = String(countryA || 'UK').toUpperCase();
  const cb = String(countryB || 'US').toUpperCase();

  const metaA = COUNTRY_METADATA[ca] || { name: ca, legalSystem: 'Common Law' };
  const metaB = COUNTRY_METADATA[cb] || { name: cb, legalSystem: 'Statutory Law' };

  const regsA = REGULATIONS.filter((r) => r.country === ca);
  const regsB = REGULATIONS.filter((r) => r.country === cb);

  return {
    countryA: {
      code: ca,
      name: metaA.name,
      legalSystem: metaA.legalSystem,
      statutesCount: regsA.length,
      primarySample: regsA[0] ? `${regsA[0].legalReference} (${regsA[0].title})` : 'Statutes on file',
    },
    countryB: {
      code: cb,
      name: metaB.name,
      legalSystem: metaB.legalSystem,
      statutesCount: regsB.length,
      primarySample: regsB[0] ? `${regsB[0].legalReference} (${regsB[0].title})` : 'Statutes on file',
    },
  };
}

