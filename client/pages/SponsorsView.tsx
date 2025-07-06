import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building2,
  ArrowLeft,
  Search,
  Heart,
  ExternalLink,
  Phone,
  Globe,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Sponsor {
  _id: string;
  name: string;
  companyName: string;
  industry: string;
  website?: string;
  phone: string;
}

export default function SponsorsView() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [filteredSponsors, setFilteredSponsors] = useState<Sponsor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [interestedSponsors, setInterestedSponsors] = useState<Set<string>>(
    new Set(),
  );
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Load sponsors from API
    loadSponsors();
  }, []);

  useEffect(() => {
    // Filter sponsors based on search term
    const filtered = sponsors.filter(
      (sponsor) =>
        sponsor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sponsor.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sponsor.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredSponsors(filtered);
  }, [sponsors, searchTerm]);

  const loadSponsors = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/sponsors/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setSponsors(result.sponsors);
        setFilteredSponsors(result.sponsors);
      } else {
        console.error("Failed to load sponsors:", result.message);
      }
    } catch (error) {
      console.error("Error loading sponsors:", error);
    }
  };

  const handleExpressInterest = async (sponsorId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/sponsors/${sponsorId}/interest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        alert("Interest expressed! The sponsor will be notified.");
        setInterestedSponsors((prev) => new Set([...prev, sponsorId]));
      } else {
        alert(result.message || "Failed to express interest");
      }
    } catch (error) {
      console.error("Error expressing interest:", error);
      alert("Network error. Please try again.");
    }
  };

  const getIndustryColor = (industry: string) => {
    const colors = {
      Technology: "bg-blue-500",
      Finance: "bg-green-500",
      Healthcare: "bg-red-500",
      Education: "bg-purple-500",
      Marketing: "bg-orange-500",
      Manufacturing: "bg-gray-500",
    };
    return colors[industry as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Available Sponsors</h1>
              <p className="text-sm text-muted-foreground">
                {user?.clubName}, {user?.collegeName}
              </p>
            </div>
          </div>
          <Link to="/organizer-dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search sponsors by company, industry, or contact person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredSponsors.length} of {sponsors.length} sponsors
            </p>
          </div>
        </div>

        {/* Sponsors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSponsors.map((sponsor) => (
            <Card
              key={sponsor._id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      {sponsor.companyName}
                    </CardTitle>
                    <Badge
                      className={`${getIndustryColor(sponsor.industry)} text-white mb-2`}
                    >
                      {sponsor.industry}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 mr-2" />
                    Contact: {sponsor.name}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    {sponsor.phone}
                  </div>
                  {sponsor.website && (
                    <div className="flex items-center text-sm">
                      <Globe className="h-4 w-4 mr-2" />
                      <a
                        href={sponsor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center"
                      >
                        Visit Website
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full"
                    onClick={() => handleExpressInterest(sponsor._id)}
                    disabled={interestedSponsors.has(sponsor._id)}
                    variant={
                      interestedSponsors.has(sponsor._id)
                        ? "secondary"
                        : "default"
                    }
                  >
                    <Heart
                      className={`h-4 w-4 mr-2 ${interestedSponsors.has(sponsor._id) ? "fill-current" : ""}`}
                    />
                    {interestedSponsors.has(sponsor._id)
                      ? "Interest Expressed ✓"
                      : "Express Interest"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSponsors.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sponsors found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search criteria"
                : "No sponsors are currently available on the platform"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
