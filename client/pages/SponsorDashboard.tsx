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
}

export default function SponsorDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Load events (mock data for now)
    setEvents([
      {
        _id: "1",
        title: "TechFest 2024",
        description:
          "Annual technical festival featuring hackathons, coding competitions, workshops, and tech talks by industry experts. Expected participation from 15+ colleges across the region.",
        organizer: {
          name: "Rajesh Kumar",
          clubName: "Computer Science Society",
          collegeName: "IIT Mumbai",
        },
        eventDate: "2024-03-15",
        expectedAttendees: 2000,
        sponsorshipAmount: 500000,
        category: "technical",
        venue: "IIT Mumbai Campus",
        brochureUrl: "/docs/techfest-brochure.pdf",
        status: "published",
      },
      {
        _id: "2",
        title: "Cultural Carnival",
        description:
          "Three-day cultural extravaganza with dance competitions, music concerts, drama performances, and art exhibitions.",
        organizer: {
          name: "Priya Sharma",
          clubName: "Cultural Committee",
          collegeName: "Delhi University",
        },
        eventDate: "2024-02-20",
        expectedAttendees: 1500,
        sponsorshipAmount: 300000,
        category: "cultural",
        venue: "DU Arts Auditorium",
        brochureUrl: "/docs/cultural-carnival-brochure.pdf",
        status: "published",
      },
      {
        _id: "3",
        title: "Innovation Summit",
        description:
          "Startup pitching event, innovation workshops, and networking sessions with entrepreneurs and investors.",
        organizer: {
          name: "Arjun Patel",
          clubName: "Entrepreneurship Cell",
          collegeName: "NIT Trichy",
        },
        eventDate: "2024-04-10",
        expectedAttendees: 1000,
        sponsorshipAmount: 400000,
        category: "academic",
        venue: "NIT Trichy Convention Center",
        status: "published",
      },
    ]);
  }, []);

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleExpressInterest = async (eventId: string) => {
    try {
      // TODO: Implement API call to express interest
      alert("Interest expressed! The organizer will be notified.");
    } catch (error) {
      alert("Failed to express interest. Please try again.");
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
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Interested
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

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleExpressInterest(selectedEvent._id);
                        setIsModalOpen(false);
                      }}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Express Interest
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
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
