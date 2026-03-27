import { useState } from 'react';
import { X, ChevronDown, ChevronRight, HelpCircle, Lightbulb } from 'lucide-react';
import { useHelpStore } from '../../stores/help-store';
import { useAuth } from '../../hooks/use-auth';
import { getHelpContent } from '../../lib/help-content';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../lib/i18n/hook';

export default function HelpSidebar() {
  const { isOpen, close, currentPageKey } = useHelpStore();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const helpContent = getHelpContent(currentPageKey, user?.role ?? null);

  function toggleSection(title: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }

  // Default all sections to expanded if not explicitly collapsed
  function isSectionExpanded(title: string) {
    return expandedSections[title] !== false;
  }

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-96 max-w-[90vw] bg-card border-l shadow-xl',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="complementary"
        aria-label={t('help.panel')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('help.title')}</h2>
          </div>
          <button
            onClick={close}
            className="rounded-md p-1 hover:bg-muted transition-colors"
            aria-label={t('help.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto h-[calc(100%-65px)] px-6 py-4">
          {helpContent ? (
            <>
              {/* Page title */}
              <h3 className="text-base font-medium text-foreground mb-2">
                {helpContent.title}
              </h3>

              {/* Description */}
              {'description' in helpContent && helpContent.description && (
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {helpContent.description}
                </p>
              )}

              {/* Collapsible sections */}
              <div className="space-y-2">
                {helpContent.sections.map((section) => {
                  const sectionKey = section.heading;
                  const expanded = isSectionExpanded(sectionKey);
                  return (
                    <div
                      key={sectionKey}
                      className="rounded-lg border bg-background"
                    >
                      <button
                        onClick={() => toggleSection(sectionKey)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg"
                        aria-expanded={expanded}
                      >
                        <span>{section.heading}</span>
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {expanded && (
                        <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">
                          {section.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tips section */}
              {helpContent.tips && helpContent.tips.length > 0 && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {t('help.tips')}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {helpContent.tips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-sm text-amber-700 dark:text-amber-400 flex gap-2"
                      >
                        <span className="mt-0.5 shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keyboard shortcut hint — uses placeholders KBD1/KBD2 to insert <kbd> elements */}
              {(() => {
                const raw = t('help.keyboardHint', { key1: '<<KBD1>>', key2: '<<KBD2>>' });
                const parts = raw.split(/<<KBD1>>|<<KBD2>>/);
                return (
                  <div className="mt-6 text-xs text-muted-foreground text-center">
                    {parts[0]}
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd>
                    {parts[1]}
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">F1</kbd>
                    {parts[2]}
                  </div>
                );
              })()}
            </>
          ) : (
            /* No content available */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm text-muted-foreground">
                {t('help.noContent')}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t('help.contactAdmin')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
