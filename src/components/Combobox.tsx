import React, { useState, useRef, useEffect } from 'react';

interface ComboboxProps {
  value: string;
  onChange: (value: string, selectedItem?: { id: string; name: string }) => void;
  items: { id: string; name: string }[];
  placeholder?: string;
  allowCreate?: boolean;
  createLabel?: (input: string) => string;
  accentColor?: 'amber' | 'emerald';
  className?: string;
}

export default function Combobox({
  value,
  onChange,
  items,
  placeholder = 'Type to search...',
  allowCreate = true,
  createLabel,
  accentColor = 'amber',
  className = ''
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(value.toLowerCase().trim())
  );

  const exactMatch = items.find(item => item.name.toLowerCase() === value.toLowerCase().trim());
  const hasInput = value.trim().length > 0;

  const ringColor = accentColor === 'amber' ? 'focus:ring-amber-500' : 'focus:ring-emerald-500';
  const hoverBgColor = accentColor === 'amber' ? 'hover:bg-amber-50' : 'hover:bg-emerald-50';
  const createBgColor = accentColor === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 ${ringColor}`}
      />
      
      {isOpen && hasInput && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredItems.map(item => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(item.name, item);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${hoverBgColor}`}
            >
              {item.name}
            </button>
          ))}
          
          {allowCreate && filteredItems.length === 0 && (
            <div className={`px-3 py-2 text-sm font-medium ${createBgColor}`}>
              {createLabel ? createLabel(value.trim()) : `"${value.trim()}" will be created as new`}
            </div>
          )}
          
          {allowCreate && filteredItems.length > 0 && !exactMatch && (
            <div className="px-3 py-2 text-xs text-stone-500 border-t border-stone-100">
              Or create new "{value.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
