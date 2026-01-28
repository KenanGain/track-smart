import {
    Shield,
    FileText,
    Calendar,
    PieChart,
    Award,
    Tag as TagIcon,
    Bookmark,
    Layers,
    Hash
} from 'lucide-react';
import { type ColorTheme } from '@/data/mock-app-data';

export const SECTION_ICONS = {
    Shield: Shield,
    FileText: FileText,
    Calendar: Calendar,
    PieChart: PieChart,
    Award: Award,
    Tag: TagIcon,
    Bookmark: Bookmark,
    Layers: Layers,
    Hash: Hash
};

export const THEME_STYLES: Record<ColorTheme, { bg: string, text: string, selectedBg: string, selectedBorder: string, hoverBorder: string, badgeBg: string, badgeText: string, ring: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', selectedBg: 'bg-blue-600', selectedBorder: 'border-blue-600', hoverBorder: 'hover:border-blue-300', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800', ring: 'ring-blue-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', selectedBg: 'bg-emerald-600', selectedBorder: 'border-emerald-600', hoverBorder: 'hover:border-emerald-300', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800', ring: 'ring-emerald-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', selectedBg: 'bg-amber-600', selectedBorder: 'border-amber-600', hoverBorder: 'hover:border-amber-300', badgeBg: 'bg-amber-100', badgeText: 'text-amber-800', ring: 'ring-amber-500' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', selectedBg: 'bg-violet-600', selectedBorder: 'border-violet-600', hoverBorder: 'hover:border-violet-300', badgeBg: 'bg-violet-100', badgeText: 'text-violet-800', ring: 'ring-violet-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', selectedBg: 'bg-rose-600', selectedBorder: 'border-rose-600', hoverBorder: 'hover:border-rose-300', badgeBg: 'bg-rose-100', badgeText: 'text-rose-800', ring: 'ring-rose-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', selectedBg: 'bg-indigo-600', selectedBorder: 'border-indigo-600', hoverBorder: 'hover:border-indigo-300', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-800', ring: 'ring-indigo-500' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', selectedBg: 'bg-cyan-600', selectedBorder: 'border-cyan-600', hoverBorder: 'hover:border-cyan-300', badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-800', ring: 'ring-cyan-500' },
};
