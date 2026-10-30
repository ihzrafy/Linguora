"use client";

import Link from "next/link";
import { LogOut, Settings, Shield, User } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserMenu({
  name,
  username,
  avatarUrl,
  isStaff,
}: {
  name: string;
  username: string;
  avatarUrl: string | null;
  isStaff: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Menu akun">
        <Avatar className="size-9">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">@{username}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/profile">
            <User /> Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings">
            <Settings /> Pengaturan
          </Link>
        </DropdownMenuItem>
        {isStaff && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield /> Admin CMS
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Keluar
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
