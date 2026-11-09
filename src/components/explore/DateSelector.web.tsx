import type {DateSelectorProps} from './DateSelector';
import {theme} from '@/constants/theme';

export default function DateSelector({label, value, onChange, minimumDate, maximumDate}: DateSelectorProps) {
    return (
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <input
            aria-label={label}
            type="date"
            value={value}
            min={minimumDate}
            max={maximumDate}
            onChange={(event) => onChange(event.target.value)}
            style={{
                boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 48,
                border: `1px solid ${theme.colors.tabBarBorder}`, borderRadius: 12,
                padding: 12, fontSize: 16, fontFamily: 'inherit',
                color: theme.colors.text, backgroundColor: theme.colors.background,
                colorScheme: 'light',
            }}
            />
            {value && (
                <button
                    type="button"
                    aria-label={`Clear ${label.toLowerCase()}`}
                    onClick={() => onChange('')}
                    style={{
                        flexShrink: 0, width: 44, height: 44, border: 'none', borderRadius: 22,
                        backgroundColor: 'transparent', color: theme.colors.inactive,
                        fontSize: 24, cursor: 'pointer',
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
}
