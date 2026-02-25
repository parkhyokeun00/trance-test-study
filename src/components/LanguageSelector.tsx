import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
  LANGUAGES,
  type LanguageCode,
  LANGUAGES_WITH_AUTO,
} from "../constants";

interface LanguageSelectorProps {
  value: LanguageCode;
  onChange: (language: LanguageCode) => void;
  includeAuto?: boolean;
}

export default function LanguageSelector({
  value,
  onChange,
  includeAuto = false,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const languages = includeAuto ? LANGUAGES_WITH_AUTO : LANGUAGES;

  const getLanguageDisplay = (code: LanguageCode) => {
    return languages.find((lang) => lang.code === code)?.name || code;
  };

  const filterLanguages = (searchTerm: string) => {
    const searchLower = searchTerm.toLowerCase();
    return languages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(searchLower) ||
        lang.code.toLowerCase().includes(searchLower)
    );
  };

  const filteredLanguages = search ? filterLanguages(search) : languages;

  const handleSelect = (language: LanguageCode) => {
    onChange(language);
    setIsOpen(false);
    setSearch("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-muted rounded-md transition-colors"
      >
        <span>{getLanguageDisplay(value)}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-border rounded-md shadow-lg z-50">
          <div className="p-2 border-b border-border">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="max-h-60 overflow-auto">
            {filteredLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                  value === lang.code ? "bg-primary-50 text-primary-800" : ""
                }`}
              >
                {lang.name}
              </button>
            ))}
            {filteredLanguages.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No languages found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
