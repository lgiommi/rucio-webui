import { HotBarCardType } from '@/lib/core/entity/hotbar';

/**
 * Shared semantic badge colors for HotBar cards and bookmark dialogs.
 */
export function getTypeBadgeStyles(type: HotBarCardType): string {
    switch (type) {
        case HotBarCardType.DID:
        case HotBarCardType.DID_LIST:
        case HotBarCardType.OPENDATA_DID_LIST:
            return 'bg-base-info-100 text-base-info-900 dark:bg-base-info-900/20 dark:text-base-info-100';

        case HotBarCardType.RULE:
        case HotBarCardType.RULE_LIST:
            return 'bg-base-success-100 text-base-success-900 dark:bg-base-success-900/20 dark:text-base-success-100';

        case HotBarCardType.RSE:
        case HotBarCardType.RSE_LIST:
            return 'bg-base-warning-100 text-base-warning-900 dark:bg-base-warning-900/20 dark:text-base-warning-100';

        case HotBarCardType.SUSPICIOUS_REPLICA_LIST:
            return 'bg-base-error-100 text-base-error-900 dark:bg-base-error-900/20 dark:text-base-error-100';

        case HotBarCardType.ACCOUNT:
        case HotBarCardType.ACCOUNT_LIST:
            return 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100';

        default:
            return 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100';
    }
}

/**
 * Format HotBar card types for display.
 */
export function formatCardType(type: HotBarCardType): string {
    if (type === HotBarCardType.OPENDATA_DID_LIST) {
        return 'OpenData DID List';
    }

    return type.replace(/_/g, ' ');
}
