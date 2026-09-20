import { X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  predefinedTags: string[];
}

export const TagInput = ({ value, onChange, predefinedTags }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const normalized = tag.trim();
    if (normalized && !value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const availablePredefinedTags = predefinedTags.filter((tag) => !value.includes(tag));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Input
        type="text"
        placeholder="Type a tag and press Enter"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {availablePredefinedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availablePredefinedTags.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addTag(tag)}
            >
              + {tag}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
