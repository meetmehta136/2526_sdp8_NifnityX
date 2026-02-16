import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronsUpDown, LogOut, User, PanelLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { navItems } from "@/config/nav";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AppSidebar({ user, ...props }) {
  const location = useLocation();
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Handle Logout
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
    }
  };




  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground group/sidebar cursor-default"
      {...props}
    >
      {/* Header Section */}
      <SidebarHeader className="h-14 flex items-center justify-center border-b border-sidebar-border bg-sidebar px-2 transition-all duration-300 ease-in-out">
        <SidebarMenu>
          <SidebarMenuItem>
            {isCollapsed ? (
              /* --- COLLAPSED STATE: Single Toggle Button --- */
              <SidebarMenuButton
                size="lg"
                onClick={toggleSidebar}
                className="flex items-center justify-center gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-300 group/toggle"
              >
                <div className="relative flex items-center justify-center size-8">
                  {/* Logo: Visible by default, fades out on SIDEBAR hover */}
                  <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out opacity-100 group-hover/sidebar:opacity-0 group-hover/sidebar:scale-90">
                    <Logo className="size-6" />
                  </div>
                  {/* Icon: Invisible by default, fades in on SIDEBAR hover */}
                  <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out text-sidebar-foreground opacity-0 scale-90 group-hover/sidebar:opacity-100 group-hover/sidebar:scale-100">
                    <PanelLeft className="size-5" />
                  </div>
                </div>
              </SidebarMenuButton>
            ) : (
              /* --- OPEN STATE: Split Logo and Close Icon --- */
              <div className="flex w-full items-center justify-between px-2 py-2">
                {/* 1. Logo -> Navigates to Dashboard */}
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center transition-opacity hover:opacity-80"
                >
                  <Logo className="size-6" />
                </Link>

                {/* 2. Close Icon -> Toggles Sidebar */}
                <button
                  onClick={toggleSidebar}
                  className="flex items-center justify-center p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  {/* Made smaller (size-4) compared to logo (size-6) */}
                  <PanelLeft className="size-4" />
                </button>
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content Section */}
      <SidebarContent
        className="bg-sidebar pt-4 transition-all duration-300 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <SidebarMenu className="gap-2 px-2">
          {navItems
            .map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <SidebarMenuItem key={item.title}>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip key={isCollapsed}>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          // Added 'group/menu-item' to strictly scope hover effects to this button only
                          className={`h-10 w-full justify-start transition-all duration-200 group-data-[collapsible=icon]:justify-center px-3 group/menu-item ${isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
                            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3">
                            <item.icon
                              // Changed to 'group-hover/menu-item' so it DOES NOT react to the parent sidebar hover
                              className={`size-5 transition-colors duration-200 ${isActive
                                ? "text-primary"
                                : "text-muted-foreground group-hover/menu-item:text-foreground"
                                }`}
                            />
                            <span className="text-[14px] group-data-[collapsible=icon]:hidden font-medium">
                              {item.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>

                      {/* Tooltip only shown when collapsed */}
                      {isCollapsed && (
                        <TooltipContent
                          side="right"
                          sideOffset={10}
                          // Fixed: Added z-[100] to prevent being hidden, and explicit bg colors for dark mode consistency
                          className="z-[100] bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-md shadow-xl px-3 py-1.5 text-xs font-medium"
                        >
                          {item.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              );
            })}
        </SidebarMenu>

      </SidebarContent>



      {/* Footer Section */}
      <SidebarFooter
        className="bg-sidebar p-2 transition-all duration-300 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors h-12"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-border/50">
                    <AvatarImage src="" alt={user?.email} />
                    <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs font-medium text-sidebar-foreground">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden ml-1">
                    <span className="truncate font-medium text-foreground">
                      {user?.role === "admin" ? "Admin" : "Trader"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl bg-sidebar border border-sidebar-border text-sidebar-foreground shadow-2xl p-1"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
                    <Avatar className="h-9 w-9 rounded-lg border border-border/50">
                      <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs text-muted-foreground">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user?.email}</span>
                      <span className="truncate text-xs text-muted-foreground capitalize">
                        {user?.role}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-sidebar-border mx-1" />
                <DropdownMenuItem asChild className="focus:bg-sidebar-accent focus:text-sidebar-accent-foreground cursor-pointer rounded-md my-0.5">
                  <Link to="/account" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-sidebar-border mx-1" />
                <DropdownMenuItem
                  className="focus:bg-destructive/10 focus:text-destructive text-destructive cursor-pointer rounded-md my-0.5"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="hover:after:bg-sidebar-border" />
    </Sidebar >
  );
}