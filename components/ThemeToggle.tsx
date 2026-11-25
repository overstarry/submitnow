"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 opacity-100 transition-[transform,opacity] duration-200 ease-out-strong dark:-rotate-45 dark:scale-75 dark:opacity-0" />
          <Moon className="absolute h-[1.15rem] w-[1.15rem] rotate-45 scale-75 opacity-0 transition-[transform,opacity] duration-200 ease-out-strong dark:rotate-0 dark:scale-100 dark:opacity-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8.5rem]">
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className="justify-between"
          >
            <span>{option.label}</span>
            {theme === option.value && (
              <Check className="size-3.5 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
