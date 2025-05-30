import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

type LoaderProps = {
  variant?: "spinner" | "skeleton" | "dots";
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
  fullPage?: boolean;
};

export function Loader({
  variant = "spinner",
  size = "md",
  text,
  className,
  fullPage = false,
}: LoaderProps) {
  // Размеры для спиннера
  const spinnerSizes = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  // Размеры для dots
  const dotSizes = {
    sm: "h-1 w-1",
    md: "h-2 w-2",
    lg: "h-3 w-3",
  };

  // Размеры для skeleton
  const skeletonSizes = {
    sm: { width: "w-24", height: "h-4" },
    md: { width: "w-32", height: "h-6" },
    lg: { width: "w-48", height: "h-8" },
  };

  // Контейнер для лоадера
  const containerClass = cn(
    "flex flex-col items-center justify-center gap-3",
    fullPage && "fixed inset-0 w-full h-full",
    className
  );

  if (variant === "spinner") {
    return (
      <div className={containerClass}>
        <div
          className={cn(
            "animate-spin rounded-full border-b-2 border-primary",
            spinnerSizes[size]
          )}
        ></div>
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={containerClass}>
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "bg-primary rounded-full animate-pulse",
                dotSizes[size]
              )}
              style={{
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={containerClass}>
        <div className="space-y-2 w-full max-w-md">
          <Skeleton
            className={cn(skeletonSizes[size].width, skeletonSizes[size].height)}
          />
          <Skeleton
            className={cn(
              skeletonSizes[size].width,
              skeletonSizes[size].height,
              "w-3/4"
            )}
          />
          <Skeleton
            className={cn(
              skeletonSizes[size].width,
              skeletonSizes[size].height,
              "w-1/2"
            )}
          />
        </div>
        {text && (
          <p className="text-sm text-muted-foreground mt-2">{text}</p>
        )}
      </div>
    );
  }

  return null;
} 