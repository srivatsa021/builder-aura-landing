import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RoleSelector, UserRole } from "@/components/ui/role-selector";
import { Handshake, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Signup() {
  const [selectedRole, setSelectedRole] = useState<UserRole>();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    // Sponsor/Company fields
    companyName: "",
    industry: "",
    website: "",
    address: "",
    // Organizer fields
    clubName: "",
    collegeName: "",
    description: "",
    // Agent fields (handled internally)
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match");
      return;
    }

    try {
      const signupData = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        role: selectedRole,
        companyName: formData.companyName,
        industry: formData.industry,
        website: formData.website,
        address: formData.address,
        clubName: formData.clubName,
        collegeName: formData.collegeName,
        description: formData.description,
      };

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupData),
      });

      const result = await response.json();

      if (result.success) {
        // Store token in localStorage
        if (result.token) {
          localStorage.setItem("token", result.token);
          localStorage.setItem("user", JSON.stringify(result.user));
        }

        alert("Account created successfully! Welcome to SponsorHub!");
        // Redirect to appropriate dashboard based on role
        // For now, redirect to home
        window.location.href = "/";
      } else {
        alert(result.message || "Signup failed. Please try again.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Network error. Please check your connection and try again.");
    }
  };

  const renderRoleSpecificFields = () => {
    switch (selectedRole) {
      case "sponsor":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Your company name"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Input
                  id="industry"
                  placeholder="e.g., Technology, Finance"
                  value={formData.industry}
                  onChange={(e) =>
                    handleInputChange("industry", e.target.value)
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Company Address *</Label>
              <Textarea
                id="address"
                placeholder="Full company address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                required
              />
            </div>
          </>
        );

      case "organizer":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clubName">Club/Cell Name *</Label>
                <Input
                  id="clubName"
                  placeholder="Your club or cell name"
                  value={formData.clubName}
                  onChange={(e) =>
                    handleInputChange("clubName", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collegeName">College/Institution *</Label>
                <Input
                  id="collegeName"
                  placeholder="Your college name"
                  value={formData.collegeName}
                  onChange={(e) =>
                    handleInputChange("collegeName", e.target.value)
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Club Description *</Label>
              <Textarea
                id="description"
                placeholder="Tell us about your club, activities, and mission"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                required
              />
            </div>
          </>
        );

      case "agent":
        return (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Agent accounts are created by invitation only. Please contact our
              team if you're interested in becoming a platform agent.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Link>

          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Handshake className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-2xl">SponsorHub</span>
          </div>

          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-muted-foreground">
            Join the sponsorship revolution
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Choose your role and fill in your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>I am a</Label>
                <RoleSelector
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                />
              </div>

              {selectedRole && (
                <>
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        placeholder="Your phone number"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm Password *
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Role-specific fields */}
                  {renderRoleSpecificFields()}

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={selectedRole === "agent"}
                  >
                    {selectedRole === "agent"
                      ? "Contact Required"
                      : "Create Account"}
                  </Button>
                </>
              )}
            </form>

            {/* Links */}
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
