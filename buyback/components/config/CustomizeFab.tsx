"use client";

import { useAtom } from "jotai";
import { editModeAtom } from "@/store/atoms";
import { useSession } from "next-auth/react";

/**
 * Floating Action Button that toggles the page customization (edit) mode.
 * The button is visible only for authenticated admin users.
 */
export function CustomizeFab() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [isEditMode, setEditMode] = useAtom(editModeAtom);

  if (!isAuthenticated) return null;

  return (
    <button
      onClick={() => setEditMode(!isEditMode)}
      className="fixed bottom-6 left-6 z-[70] flex items-center px-5 py-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
      style={{
        backgroundColor: isEditMode ? "#EF4444" : "#2563EB", // red when active, blue when inactive
        color: "#ffffff",
      }}
      aria-label={isEditMode ? "Exit customize mode" : "Customize page"}
      title={isEditMode ? "Exit customize mode" : "Customize page"}
    >
      {/* Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 mr-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {isEditMode ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a8 8 0 108 8 8.009 8.009 0 00-8-8zm0 11.646a3.646 3.646 0 113.646-3.646A3.65 3.65 0 0112 16z"
          />
        )}
      </svg>
      <span className="whitespace-nowrap text-sm font-medium select-none">
        {isEditMode ? "Done" : "Customize"}
      </span>
    </button>
  );
} 