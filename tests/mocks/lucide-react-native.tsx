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
export const ArrowDownAZ = createMockIcon('ArrowDownAZ');
export const Archive = createMockIcon('Archive');
export const Banknote = createMockIcon('Banknote');
export const BanknoteArrowDown = createMockIcon('BanknoteArrowDown');
export const Bell = createMockIcon('Bell');
export const BellRing = createMockIcon('BellRing');
export const Car = createMockIcon('Car');
export const ChartColumn = createMockIcon('ChartColumn');
export const ChartNoAxesCombined = createMockIcon('ChartNoAxesCombined');
export const Check = createMockIcon('Check');
export const CheckCircle2 = createMockIcon('CheckCircle2');
export const ChevronRight = createMockIcon('ChevronRight');
export const CircleAlert = createMockIcon('CircleAlert');
export const CircleDollarSign = createMockIcon('CircleDollarSign');
export const Clock3 = createMockIcon('Clock3');
export const ClockAlert = createMockIcon('ClockAlert');
export const Cloud = createMockIcon('Cloud');
export const Construction = createMockIcon('Construction');
export const DatabaseBackup = createMockIcon('DatabaseBackup');
export const CircleX = createMockIcon('CircleX');
export const Eye = createMockIcon('Eye');
export const EyeOff = createMockIcon('EyeOff');
export const FileQuestion = createMockIcon('FileQuestion');
export const FileText = createMockIcon('FileText');
export const FileX2 = createMockIcon('FileX2');
export const Fingerprint = createMockIcon('Fingerprint');
export const History = createMockIcon('History');
export const House = createMockIcon('House');
export const Inbox = createMockIcon('Inbox');
export const Info = createMockIcon('Info');
export const ListFilter = createMockIcon('ListFilter');
export const LockKeyhole = createMockIcon('LockKeyhole');
export const MessageCircle = createMockIcon('MessageCircle');
export const Moon = createMockIcon('Moon');
export const Palette = createMockIcon('Palette');
export const Pencil = createMockIcon('Pencil');
export const Plus = createMockIcon('Plus');
export const ReceiptText = createMockIcon('ReceiptText');
export const RefreshCw = createMockIcon('RefreshCw');
export const RotateCcw = createMockIcon('RotateCcw');
export const Save = createMockIcon('Save');
export const Search = createMockIcon('Search');
export const Settings = createMockIcon('Settings');
export const ShieldCheck = createMockIcon('ShieldCheck');
export const Smartphone = createMockIcon('Smartphone');
export const Sun = createMockIcon('Sun');
export const TrendingUp = createMockIcon('TrendingUp');
export const UserPlus = createMockIcon('UserPlus');
export const UserRound = createMockIcon('UserRound');
export const UserRoundPlus = createMockIcon('UserRoundPlus');
export const Users = createMockIcon('Users');
export const Wallet = createMockIcon('Wallet');
export const WalletCards = createMockIcon('WalletCards');
export const X = createMockIcon('X');
