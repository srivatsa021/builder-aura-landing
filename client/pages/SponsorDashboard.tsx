import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Building2,
  Eye,
  Heart,
  FileText,
  Download,
} from "lucide-react";

interface Package {
  _id: string;
  packageNumber: number;
  amount: number;
  deliverables: string;
  status: string;
  hasExpressedInterest?: boolean;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  organizer: {
    name: string;
    clubName: string;
    collegeName: string;
  };
  eventDate: string;
  expectedAttendees: number;
  sponsorshipAmount: number;
  category: string;
  venue: string;
  brochureUrl?: string;
  status: string;
  packages?: Package[];
}

export default function SponsorDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [interestedEvents, setInterestedEvents] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Load real events from API
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/events");
      const result = await response.json();

      if (result.success) {
        // Transform data to match interface
        const transformedEvents = result.events.map((event: any) => ({
          _id: event._id,
          title: event.title,
          description: event.description,
          organizer: {
            name:
              event.organizer?.name ||
              event.organizer.organizer?.name ||
              "Event Organizer",
            clubName:
              event.organizer?.clubName ||
              event.organizer.organizer?.clubName ||
              "Club",
            collegeName:
              event.organizer?.collegeName ||
              event.organizer.organizer?.collegeName ||
              "College",
          },
          eventDate: event.eventDate,
          expectedAttendees: event.expectedAttendees,
          sponsorshipAmount: event.sponsorshipAmount,
          category: event.category,
          venue: event.venue,
          brochureUrl: event.brochureUrl,
          status: event.status,
        }));
        setEvents(transformedEvents);
      } else {
        console.error("Failed to load events:", result.message);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleViewDetails = async (event: Event) => {
    setSelectedEvent(event);

    // Load packages for this event
    try {
      const response = await fetch(`/api/events/${event._id}/packages`);
      const result = await response.json();
      if (result.success) {
        setSelectedEvent({ ...event, packages: result.packages });
      } else {
        setSelectedEvent({ ...event, packages: [] });
      }
    } catch (error) {
      console.error("Error loading packages:", error);
      setSelectedEvent({ ...event, packages: [] });
    }

    setIsModalOpen(true);
  };

  const handleExpressInterest = async (eventId: string, packageId?: string) => {
    try {
      const token = localStorage.getItem("token");
      const url = packageId
        ? `/api/packages/${packageId}/interest`
        : `/api/events/${eventId}/interest`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        alert(
          packageId
            ? "Interest expressed in package! The organizer will be notified."
            : "Interest expressed! The organizer will be notified.",
        );

        if (packageId) {
          // Update package interest in the selected event
          if (selectedEvent) {
            const updatedPackages = selectedEvent.packages?.map((pkg) =>
              pkg._id === packageId
                ? { ...pkg, hasExpressedInterest: true }
                : pkg,
            );
            setSelectedEvent({ ...selectedEvent, packages: updatedPackages });
          }
        } else {
          // Add to interested events list
          setInterestedEvents((prev) => new Set([...prev, eventId]));
        }
      } else {
        alert(result.message || "Failed to express interest");
      }
    } catch (error) {
      console.error("Error expressing interest:", error);
      alert("Network error. Please try again.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      technical: "bg-blue-500",
      cultural: "bg-purple-500",
      academic: "bg-green-500",
      sports: "bg-orange-500",
      social: "bg-pink-500",
    };
    return colors[category as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Sponsor Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.name}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Available Events</h2>
          <p className="text-muted-foreground">
            Discover sponsorship opportunities from college events
          </p>
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      {event.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={`${getCategoryColor(event.category)} text-white`}
                      >
                        {event.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  by {event.organizer.clubName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {event.organizer.collegeName}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm line-clamp-3">{event.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(event.eventDate)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    {event.expectedAttendees.toLocaleString()} attendees
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.venue}
                  </div>
                  <div className="flex items-center text-sm font-semibold text-primary">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {formatCurrency(event.sponsorshipAmount)}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDetails(event)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExpressInterest(event._id)}
                    disabled={interestedEvents.has(event._id)}
                    variant={
                      interestedEvents.has(event._id) ? "secondary" : "default"
                    }
                  >
                    <Heart
                      className={`h-4 w-4 mr-2 ${interestedEvents.has(event._id) ? "fill-current" : ""}`}
                    />
                    {interestedEvents.has(event._id)
                      ? "Interested ✓"
                      : "Express Interest"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Event Details Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {selectedEvent.title}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      className={`${getCategoryColor(selectedEvent.category)} text-white`}
                    >
                      {selectedEvent.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      by {selectedEvent.organizer.clubName},{" "}
                      {selectedEvent.organizer.collegeName}
                    </span>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Event Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Event Description
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedEvent.description}
                    </p>
                  </div>

                  {/* Event Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Event Date
                            </p>
                            <p className="font-medium">
                              {formatDate(selectedEvent.eventDate)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Expected Attendees
                            </p>
                            <p className="font-medium">
                              {selectedEvent.expectedAttendees.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Venue
                            </p>
                            <p className="font-medium">{selectedEvent.venue}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Sponsorship Amount
                            </p>
                            <p className="font-medium text-primary">
                              {formatCurrency(selectedEvent.sponsorshipAmount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Documents */}
                  {selectedEvent.brochureUrl && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">
                        Event Documents
                      </h3>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">Event Brochure</p>
                                <p className="text-sm text-muted-foreground">
                                  PDF Document
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Organizer Contact
                    </h3>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p>
                            <span className="font-medium">Contact Person:</span>{" "}
                            {selectedEvent.organizer.name}
                          </p>
                          <p>
                            <span className="font-medium">Organization:</span>{" "}
                            {selectedEvent.organizer.clubName}
                          </p>
                          <p>
                            <span className="font-medium">Institution:</span>{" "}
                            {selectedEvent.organizer.collegeName}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sponsorship Packages */}
                  {selectedEvent.packages &&
                    selectedEvent.packages.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">
                          Sponsorship Packages
                        </h3>
                        <div className="grid gap-4">
                          {selectedEvent.packages.map((pkg) => (
                            <Card
                              key={pkg._id}
                              className="border-l-4 border-l-primary"
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-lg mb-2">
                                      Package {pkg.packageNumber}
                                    </h4>
                                    <div className="space-y-2">
                                      <div className="flex items-center">
                                        <DollarSign className="h-4 w-4 mr-2 text-primary" />
                                        <span className="font-semibold text-primary">
                                          {formatCurrency(pkg.amount)}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">
                                          <strong>Deliverables:</strong>{" "}
                                          {pkg.deliverables}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <Button
                                      onClick={() =>
                                        handleExpressInterest(
                                          selectedEvent._id,
                                          pkg._id,
                                        )
                                      }
                                      disabled={pkg.hasExpressedInterest}
                                      variant={
                                        pkg.hasExpressedInterest
                                          ? "secondary"
                                          : "default"
                                      }
                                      size="sm"
                                    >
                                      <Heart
                                        className={`h-4 w-4 mr-2 ${pkg.hasExpressedInterest ? "fill-current" : ""}`}
                                      />
                                      {pkg.hasExpressedInterest
                                        ? "Interested ✓"
                                        : "Express Interest"}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
