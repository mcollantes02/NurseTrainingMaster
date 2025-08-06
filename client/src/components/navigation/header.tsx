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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-1 sm:gap-2">
          <div className="flex items-center min-w-0 flex-shrink">
            <Stethoscope className="text-blue-600 text-xl sm:text-2xl mr-1 sm:mr-2 flex-shrink-0" />
            <h1 className="text-sm sm:text-base lg:text-xl font-semibold text-gray-900 truncate">
              <span className="hidden xl:inline">{t("app.title")}</span>
              <span className="hidden md:inline xl:hidden">EIR Mock Exam Manager</span>
              <span className="hidden sm:inline md:hidden">EIR Mock Exam</span>
              <span className="sm:hidden">EIR</span>
            </h1>
          </div>

          <div className="flex items-center space-x-0.5 sm:space-x-1 lg:space-x-2 flex-shrink-0 overflow-hidden">
            {/* Dashboard button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="text-gray-600 hover:text-gray-900 p-1.5 sm:p-2 lg:px-3"
            >
              <Stethoscope className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">Dashboard</span>
            </Button>

            {/* Statistics button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/statistics'}
              className="text-gray-600 hover:text-gray-900 p-1.5 sm:p-2 lg:px-3"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">{t("statistics.title")}</span>
            </Button>

            {/* Trash button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTrashModalOpen(true)}
              className="text-gray-600 hover:text-gray-900 p-1.5 sm:p-2 lg:px-3"
            >
              <Trash2 className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">{t("trash.title")}</span>
            </Button>

            {/* Manage button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdmin(true)}
              className="text-gray-600 hover:text-gray-900 p-1.5 sm:p-2 lg:px-3"
            >
              <Settings className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">{t("manage")}</span>
            </Button>

            {/* Language Switcher */}
            <Select value={language} onValueChange={changeLanguage}>
              <SelectTrigger className="w-auto min-w-0 border-gray-300 px-2 sm:px-3">
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
                  className="flex items-center space-x-1 sm:space-x-2 text-gray-700 hover:text-gray-900 min-w-0 px-1 sm:px-2"
                >
                  <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs sm:text-sm font-medium truncate max-w-20 sm:max-w-none hidden sm:inline">
                    {user ? (user.displayName || user.email || "User") : "User"}
                  </span>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
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