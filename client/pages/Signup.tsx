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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    gstNumber: "",
    // Organizer fields
    clubName: "",
    collegeName: "",
    description: "",
    // Agent fields (handled internally)
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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
        gstNumber: formData.gstNumber,
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
        if (selectedRole === "sponsor") {
          alert(
            result.message ||
              "Thank you! Your sponsor profile request was submitted. Your profile will be created shortly after admin approval.",
          );
          window.location.href = "/login";
          return;
        }

        // For non-sponsor roles, proceed with normal login flow
        if (result.token) {
          localStorage.setItem("token", result.token);
          localStorage.setItem("user", JSON.stringify(result.user));
        }

        alert("Account created successfully! Welcome to SponsorHub!");
        switch (selectedRole) {
          case "organizer":
            window.location.href = "/organizer-dashboard";
            break;
          default:
            window.location.href = "/";
        }
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
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number *</Label>
              <Input
                id="gstNumber"
                placeholder="15-digit GSTIN"
                value={formData.gstNumber}
                onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())}
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
                  allowedRoles={["sponsor", "organizer"]}
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

                  {/* Terms & Conditions */}
                  <div className="flex items-start gap-3">
                    <Checkbox id="acceptTerms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(Boolean(v))} />
                    <Label htmlFor="acceptTerms" className="text-sm leading-relaxed">
                      I agree to the
                      {" "}
                      <button type="button" className="text-accent underline" onClick={() => setShowTerms(true)}>
                        Terms & Conditions
                      </button>
                    </Label>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!acceptTerms}
                  >
                    Create Account
                  </Button>

                  {/* Terms Modal */}
                  <Dialog open={showTerms} onOpenChange={setShowTerms}>
                    <DialogContent className="max-w-2xl max-h-[85vh] p-0">
                      <DialogHeader className="px-6 pt-6">
                        <DialogTitle>Terms & Conditions</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="px-6 pb-6">
                        <div className="space-y-4 text-sm text-foreground/90">
                          <p>
                            These Terms & Conditions ("Terms") govern the use of the SponsorHub platform by
                            event organizers ("Organizers"), sponsors ("Sponsors"), and agents ("Agents"). By
                            creating an account, you acknowledge that you have read, understood, and agree to be
                            bound by these Terms.
                          </p>
                          <ol className="list-decimal pl-5 space-y-3">
                            <li>
                              Role of SponsorHub: SponsorHub is a facilitation platform that connects Organizers and
                              Sponsors. SponsorHub does not guarantee outcomes, performance, or the fulfillment of
                              any obligations agreed between parties.
                            </li>
                            <li>
                              Deliverables & Performance: All deliverables, timelines, promotional activities, and
                              financial terms are agreed directly between the Organizer and Sponsor. Each party is
                              solely responsible for honoring its commitments. SponsorHub is not responsible for any
                              failure by either party to fulfill obligations.
                            </li>
                            <li>
                              Payments & Finances: Payment schedules, amounts, and refunds (if any) are governed by
                              the agreement between the Organizer and Sponsor. SponsorHub is not a party to such
                              agreements unless expressly stated in writing.
                            </li>
                            <li>
                              Disputes & Legal Action: If deliverables or finances are not fulfilled, both parties
                              retain the right to seek appropriate legal remedies against each other. SponsorHub will
                              cooperate reasonably with lawful requests but is not liable for losses arising from any
                              dispute between parties.
                            </li>
                            <li>
                              Accuracy of Information: Users must provide accurate and lawful information (including
                              GST and business details, where applicable). Misrepresentation may result in suspension
                              or termination of access.
                            </li>
                            <li>
                              Compliance: Users agree to comply with applicable laws, advertising standards, and
                              institutional policies related to events and sponsorships.
                            </li>
                            <li>
                              Limitation of Liability: To the maximum extent permitted by law, SponsorHub shall not
                              be liable for indirect, incidental, special, or consequential damages, or for any loss
                              of profits or business interruptions arising from use of the platform or third‑party
                              agreements.
                            </li>
                            <li>
                              Termination: SponsorHub may suspend or terminate access for violations of these Terms
                              or unlawful activity.
                            </li>
                            <li>
                              Changes: SponsorHub may update these Terms from time to time. Continued use after
                              changes constitutes acceptance of the updated Terms.
                            </li>
                          </ol>
                          <p>
                            By continuing, you confirm you understand that SponsorHub facilitates connections but is
                            not responsible for contract performance between Organizers and Sponsors.
                          </p>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </form>

            {/* Links */}
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-accent hover:underline">
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
