"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "홈", icon: "⌂" },
  { href: "/ocr", label: "OCR", icon: "Aa" },
  { href: "/parser", label: "Parser", icon: "⊞" },
  { href: "/image", label: "Image", icon: "🖼" },
  { href: "/agent", label: "Agent", icon: "⟣" },
] as const;

function NavLink({
  href,
  label,
  icon,
  isActive,
  isMobile,
}: {
  href: string;
  label: string;
  icon: string;
  isActive: boolean;
  isMobile?: boolean;
}) {
  if (isMobile) {
    return (
      <Link
        href={href}
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10px] font-medium transition active:scale-95 ${
          isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-600 dark:text-slate-400"
        }`}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="text-[18px]">{icon}</span>
        <span className="leading-tight">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition sm:min-h-0 sm:min-w-0 ${
        isActive
          ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Top Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur-sm supports-[padding:env(safe-area-inset-top)]:pt-[max(8px,env(safe-area-inset-top))] dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="flex min-h-[44px] min-w-[44px] items-center text-base font-semibold text-slate-900 hover:text-teal-600 sm:min-h-0 sm:min-w-0 sm:text-lg dark:text-white dark:hover:text-teal-400"
          >
            Omniparse AI Stack
          </Link>

          {/* Desktop nav - hidden on mobile (bottom nav 사용) */}
          <ul className="hidden gap-1 sm:flex sm:gap-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={isActive(item.href)}
                />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Bottom Nav - Mobile only (44px+ 터치 영역) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur-sm sm:hidden dark:border-slate-800 dark:bg-slate-900/95"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isActive(item.href)}
            isMobile
          />
        ))}
      </nav>
    </>
  );
}
