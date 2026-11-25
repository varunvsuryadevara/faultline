import { useState } from 'react';
import { Check, Globe, MapPin, Scale, Search, X } from 'lucide-react';
import { COUNTRY_METADATA, REGIONAL_JURISDICTIONS } from '../../../shared/regulations/vocab.js';
import { Button, cx } from '../ui.jsx';

export default function JurisdictionSelectorModal({
  isOpen,
  onClose,
  currentCountry = 'UK',
  currentRegion = null,
  onSelectJurisdiction,
}) {
  const [selectedCountry, setSelectedCountry] = useState(currentCountry || 'UK');
  const [selectedRegion, setSelectedRegion] = useState(currentRegion);
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const countries = Object.values(COUNTRY_METADATA);
  const filteredCountries = countries.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.legalSystem.toLowerCase().includes(q);
  });

  const availableRegions = REGIONAL_JURISDICTIONS[selectedCountry] || [];

  const handleApply = () => {
    onSelectJurisdiction({
      countryCode: selectedCountry,
      region: selectedRegion,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-xl border border-rule bg-sheet shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rule px-6 py-4 bg-paper/50">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-pen/15 text-pen-bright">
              <Globe className="size-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-ink">Select Applicable Jurisdiction</h3>
              <p className="text-[12px] text-ink-3">
                Change country or regional jurisdiction to update applicable statutory regulations and legal assessments
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-hover hover:text-ink transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto scrollbar-thin">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-ink-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country, code, or legal system..."
              className="w-full rounded-lg border border-rule bg-paper py-2 pl-9 pr-3 text-[13.5px] text-ink placeholder:text-ink-3 focus:border-pen focus:outline-hidden"
            />
          </div>

          {/* Country Selection Grid */}
          <div>
            <label className="block text-[12.5px] font-bold uppercase tracking-wider text-ink-3 mb-2">
              National Jurisdiction (20 Available)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {filteredCountries.map((c) => {
                const isSelected = selectedCountry === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(c.code);
                      const regs = REGIONAL_JURISDICTIONS[c.code] || [];
                      setSelectedRegion(regs.length ? regs[0].code : null);
                    }}
                    className={cx(
                      'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all',
                      isSelected
                        ? 'border-pen bg-pen/10 text-pen-bright ring-1 ring-pen'
                        : 'border-rule/80 bg-paper/60 hover:bg-hover text-ink-2 hover:border-rule-strong',
                    )}
                  >
                    <span className="text-xl leading-none">{c.flag}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold truncate leading-tight">{c.name}</p>
                      <p className="text-[10px] text-ink-3 truncate">{c.code}</p>
                    </div>
                    {isSelected && <Check className="size-3.5 text-pen shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Regional Sub-Jurisdiction Selection if available */}
          {availableRegions.length > 0 && (
            <div className="border-t border-rule/70 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="size-3.5 text-pen" />
                <label className="text-[12.5px] font-bold uppercase tracking-wider text-ink">
                  Regional Jurisdiction / State / Province
                </label>
              </div>
              <p className="text-[12px] text-ink-3 mb-2.5">
                Certain motor claims, negligence thresholds, and reporting requirements vary significantly by state/province.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableRegions.map((reg) => {
                  const isRegSelected = selectedRegion === reg.code;
                  return (
                    <button
                      key={reg.code}
                      type="button"
                      onClick={() => setSelectedRegion(reg.code)}
                      className={cx(
                        'flex items-center justify-between p-2.5 rounded-lg border text-left transition-all text-[12.5px]',
                        isRegSelected
                          ? 'border-pen bg-pen/10 text-pen-bright font-bold ring-1 ring-pen'
                          : 'border-rule/70 bg-paper/50 hover:bg-hover text-ink-2',
                      )}
                    >
                      <span className="truncate">{reg.name}</span>
                      {isRegSelected && <Check className="size-3.5 text-pen shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Jurisdiction Overview Card */}
          {selectedCountry && (
            <div className="rounded-lg border border-rule bg-paper p-3.5 text-[12.5px] space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Selected Framework</span>
              <p className="font-bold text-ink">
                {COUNTRY_METADATA[selectedCountry]?.name}{' '}
                {selectedRegion ? `• ${availableRegions.find((r) => r.code === selectedRegion)?.name || selectedRegion}` : ''}
              </p>
              <p className="text-ink-3">
                Legal Tradition: <span className="text-ink-2">{COUNTRY_METADATA[selectedCountry]?.legalSystem}</span>
              </p>
              <p className="text-ink-3">
                Lead Regulator: <span className="text-ink-2">{COUNTRY_METADATA[selectedCountry]?.regulator}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-rule px-6 py-3.5 bg-paper/50">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply Jurisdiction
          </Button>
        </div>
      </div>
    </div>
  );
}
