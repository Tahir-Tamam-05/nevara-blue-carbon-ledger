import { SectionLabel, Section } from "./LandingLayout";

interface SubHeroProps {
  label: string;
  title: string;
  subtitle: string;
  breadcrumb?: string;
}

export function SubHero({ label, title, subtitle, breadcrumb }: SubHeroProps) {
  return (
    <section className="bg-white dark:bg-[#040D0B] pt-32 pb-20 text-center transition-colors duration-300">
      <Section className="mx-auto max-w-4xl px-6">
        <SectionLabel>{label}</SectionLabel>
        <h1 className="font-syne mb-6 text-5xl font-bold text-gray-900 dark:text-white sm:text-6xl">
          {title}
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
        {breadcrumb && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-600">
            {breadcrumb}
          </p>
        )}
      </Section>
    </section>
  );
}
