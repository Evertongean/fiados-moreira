import { View, type ViewProps } from 'react-native';

interface MockIconProps extends ViewProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

function createMockIcon(name: string) {
  return function MockIcon({
    color: _color,
    size: _size,
    strokeWidth: _strokeWidth,
    ...props
  }: MockIconProps) {
    return <View accessibilityLabel={name} {...props} />;
  };
}

export const ArrowLeft = createMockIcon('ArrowLeft');
export const Check = createMockIcon('Check');
export const CheckCircle2 = createMockIcon('CheckCircle2');
export const ChevronRight = createMockIcon('ChevronRight');
export const CircleAlert = createMockIcon('CircleAlert');
export const CircleDollarSign = createMockIcon('CircleDollarSign');
export const CircleX = createMockIcon('CircleX');
export const Eye = createMockIcon('Eye');
export const EyeOff = createMockIcon('EyeOff');
export const Inbox = createMockIcon('Inbox');
export const Info = createMockIcon('Info');
export const Palette = createMockIcon('Palette');
export const Search = createMockIcon('Search');
export const ShieldCheck = createMockIcon('ShieldCheck');
export const WalletCards = createMockIcon('WalletCards');
export const X = createMockIcon('X');
