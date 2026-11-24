import { Search, X } from 'lucide-react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Input, type InputProps } from '@/components/ui/Input';

export interface SearchInputProps extends Omit<
  InputProps,
  'startIcon' | 'endIcon' | 'endAccessory'
> {
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChangeText,
  onClear,
  placeholder = 'Pesquisar',
  ...props
}: SearchInputProps) {
  const hasValue = typeof value === 'string' && value.length > 0;

  return (
    <Input
      accessibilityLabel={props.accessibilityLabel ?? 'Campo de pesquisa'}
      autoCapitalize="none"
      endAccessory={
        hasValue ? (
          <IconButton
            accessibilityLabel="Limpar pesquisa"
            icon={X}
            onPress={() => {
              onChangeText?.('');
              onClear?.();
            }}
            size="sm"
            variant="ghost"
          />
        ) : undefined
      }
      onChangeText={onChangeText}
      placeholder={placeholder}
      returnKeyType="search"
      startIcon={Search}
      value={value}
      {...props}
    />
  );
}
