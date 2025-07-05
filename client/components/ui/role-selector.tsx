import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, UserCheck } from "lucide-react";

export type UserRole = "sponsor" | "organizer" | "agent";

interface RoleSelectorProps {
  value?: UserRole;
  onValueChange?: (value: UserRole) => void;
  className?: string;
}

const roles = [
  {
    value: "sponsor" as const,
    label: "Sponsor/Company",
    description: "Looking to sponsor events and connect with organizers",
    icon: Building2,
  },
  {
    value: "organizer" as const,
    label: "Event Organizer",
    description: "College clubs, cells, and event organizers seeking sponsors",
    icon: Users,
  },
  {
    value: "agent" as const,
    label: "Platform Agent",
    description: "Mediating and facilitating sponsorship deals",
    icon: UserCheck,
  },
];

export function RoleSelector({
  value,
  onValueChange,
  className,
}: RoleSelectorProps) {
  return (
    <div className={cn("grid gap-3", className)}>
      {roles.map((role) => {
        const Icon = role.icon;
        const isSelected = value === role.value;

        return (
          <Card
            key={role.value}
            className={cn(
              "cursor-pointer transition-all border-2 hover:border-primary/50",
              isSelected
                ? "border-primary ring-2 ring-primary/20"
                : "border-border",
            )}
            onClick={() => onValueChange?.(role.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium text-sm">{role.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
