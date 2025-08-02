import { useState } from "react";
import { Stethoscope, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Settings, BarChart3 } from "lucide-react"; // Added Trash2 and BarChart3 icons
import { TrashModal } from "@/components/modals/trash-modal"; // Added TrashModal component
import { AdminModal } from "@/components/modals/admin-modal";

interface HeaderProps {
  onUserProfileClick: () => void;
}

export function Header({ onUserProfileClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";

    // For Firebase users, use displayName or email as fallback
    if (user.displayName) {
      const names = user.displayName.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }

    // Fallback to email first letter
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }

    return "U";
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Stethoscope className="text-blue-600 text-2xl mr-3" />
            <h1 className="text-xl font-semibold text-gray-900">
              {t("app.title")}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
               {/* Statistics button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/statistics'}
              className="text-gray-600 hover:text-gray-900"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">{t("statistics.title")}</span>
            </Button>

            {/* Trash button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTrashModalOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Trash2 className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">{t("trash.title")}</span>
            </Button>

            {/* Manage button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdmin(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Settings className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Administrar</span>
            </Button>

            {/* Language Switcher */}
            <Select value={language} onValueChange={changeLanguage}>
              <SelectTrigger className="w-auto border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">🇪🇸 Español</SelectItem>
                <SelectItem value="en">🇺🇸 English</SelectItem>
              </SelectContent>
            </Select>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {user ? (user.displayName || user.email || "User") : "User"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onUserProfileClick}>
                  {t("user.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  {t("user.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <TrashModal
          isOpen={isTrashModalOpen}
          onClose={() => setIsTrashModalOpen(false)}
        />
        <AdminModal
          isOpen={showAdmin}
          onClose={() => setShowAdmin(false)}
        />
    </nav>
  );
}