import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Building2,
  Bell,
  Eye,
  Edit,
  Trash2,
  Upload,
  Check,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Event {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  expectedAttendees: number;
  sponsorshipAmount: number;
  category: string;
  venue: string;
  status: "draft" | "published" | "sponsored" | "completed";
  interestedSponsors: number;
}

interface Sponsor {
  _id: string;
  companyName: string;
  industry: string;
  website?: string;
  contactPerson: string;
  status: "open" | "busy";
  lastActive: string;
}

interface Notification {
  _id: string;
  type: "sponsor_interest";
  message: string;
  eventTitle: string;
  sponsorName: string;
  timestamp: string;
  read: boolean;
}

export default function OrganizerDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [isInterestedSponsorsOpen, setIsInterestedSponsorsOpen] =
    useState(false);
  const [selectedEventForSponsors, setSelectedEventForSponsors] =
    useState<Event | null>(null);
  const [interestedSponsors, setInterestedSponsors] = useState<any[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    expectedAttendees: "",
    category: "",
    venue: "",
  });

  // Package form state
  const [packageCount, setPackageCount] = useState(1);
  const [packages, setPackages] = useState([{ amount: "", deliverables: "" }]);

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Load real data from API
    loadEvents();
    loadSponsors();
  }, []);

  const loadEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/events/organizer", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        // Transform data and get interested sponsors count from packages
        const transformedEvents = await Promise.all(
          result.events.map(async (event: any) => {
            // Get packages for this event to count interested sponsors
            let interestedSponsorsCount = 0;
            try {
              const packagesResponse = await fetch(
                `/api/events/${event._id}/packages`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );
              const packagesResult = await packagesResponse.json();
              if (packagesResult.success) {
                // Count unique interested sponsors across all packages
                const uniqueSponsorIds = new Set();
                packagesResult.packages.forEach((pkg: any) => {
                  pkg.interestedSponsors?.forEach((sponsor: any) => {
                    uniqueSponsorIds.add(sponsor._id);
                  });
                });
                interestedSponsorsCount = uniqueSponsorIds.size;
              }
            } catch (error) {
              console.error(
                "Error loading packages for event:",
                event._id,
                error,
              );
            }

            return {
              _id: event._id,
              title: event.title,
              description: event.description,
              eventDate: event.eventDate,
              expectedAttendees: event.expectedAttendees,
              sponsorshipAmount: event.sponsorshipAmount,
              category: event.category,
              venue: event.venue,
              status: event.status,
              interestedSponsors: interestedSponsorsCount,
            };
          }),
        );
        setEvents(transformedEvents);
      } else {
        console.error("Failed to load events:", result.message);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const loadSponsors = async () => {
    try {
      const response = await fetch("/api/sponsors");
      const result = await response.json();
      if (result.success) {
        setSponsors(result.sponsors);
      } else {
        console.error("Failed to load sponsors:", result.message);
      }
    } catch (error) {
      console.error("Error loading sponsors:", error);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate packages
    for (let i = 0; i < packages.length; i++) {
      if (!packages[i].amount || !packages[i].deliverables) {
        alert(`Package ${i + 1}: Please fill in both amount and deliverables`);
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");

      if (editingEvent) {
        // For updates, we only update the basic event info for now
        const response = await fetch(`/api/events/${editingEvent._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...eventForm,
            sponsorshipAmount: packages[0]?.amount || 0, // Temporary fallback
            status: "published",
          }),
        });

        const result = await response.json();
        if (result.success) {
          alert("Event updated successfully!");
          resetForm();
          loadEvents();
        } else {
          alert(result.message || "Failed to update event");
        }
      } else {
        // Create new event
        const eventResponse = await fetch("/api/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...eventForm,
            sponsorshipAmount: packages.reduce(
              (sum, pkg) => sum + parseInt(pkg.amount),
              0,
            ), // Total amount
            status: "published",
          }),
        });

        const eventResult = await eventResponse.json();
        if (eventResult.success) {
          // Create packages for the event
          const packagesResponse = await fetch(
            `/api/events/${eventResult.event._id}/packages`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ packages }),
            },
          );

          const packagesResult = await packagesResponse.json();
          if (packagesResult.success) {
            alert("Event and packages created successfully!");
            resetForm();
            loadEvents();
          } else {
            alert(
              "Event created but failed to create packages: " +
                packagesResult.message,
            );
          }
        } else {
          alert(eventResult.message || "Failed to create event");
        }
      }
    } catch (error) {
      console.error(
        `Error ${editingEvent ? "updating" : "creating"} event:`,
        error,
      );
      alert("Network error. Please try again.");
    }
  };

  const resetForm = () => {
    setIsEventFormOpen(false);
    setEditingEvent(null);
    setEventForm({
      title: "",
      description: "",
      eventDate: "",
      expectedAttendees: "",
      category: "",
      venue: "",
    });
    setPackages([{ amount: "", deliverables: "" }]);
    setPackageCount(1);
  };

  const handlePackageCountChange = (count: number) => {
    setPackageCount(count);
    const newPackages = Array.from(
      { length: count },
      (_, i) => packages[i] || { amount: "", deliverables: "" },
    );
    setPackages(newPackages);
  };

  const handlePackageChange = (
    index: number,
    field: "amount" | "deliverables",
    value: string,
  ) => {
    const newPackages = [...packages];
    newPackages[index] = { ...newPackages[index], [field]: value };
    setPackages(newPackages);
  };

  const handleNotificationResponse = (
    notificationId: string,
    action: "accept" | "decline",
  ) => {
    // TODO: Implement API call to respond to sponsor interest
    console.log(`${action} notification:`, notificationId);

    if (action === "accept") {
      alert(
        "Interest accepted! An agent will be assigned to mediate the deal.",
      );
    } else {
      alert("Interest declined.");
    }

    // Remove notification from list
    setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    setIsNotificationOpen(false);
  };

  const handleEditEvent = async (event: Event) => {
    setEditingEvent(event);
    // Format date to YYYY-MM-DD for input field
    const formattedDate = event.eventDate.includes("T")
      ? event.eventDate.split("T")[0]
      : event.eventDate.split(" ")[0] || event.eventDate;

    setEventForm({
      title: event.title,
      description: event.description,
      eventDate: formattedDate,
      expectedAttendees: event.expectedAttendees.toString(),
      category: event.category,
      venue: event.venue,
    });

    // Load existing packages for edit mode
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/events/${event._id}/packages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success && result.packages.length > 0) {
        const existingPackages = result.packages.map((pkg: any) => ({
          amount: pkg.amount.toString(),
          deliverables: pkg.deliverables,
        }));
        setPackages(existingPackages);
        setPackageCount(existingPackages.length);
      } else {
        // No existing packages, set default
        setPackages([{ amount: "", deliverables: "" }]);
        setPackageCount(1);
      }
    } catch (error) {
      console.error("Error loading packages:", error);
      // Fallback to default
      setPackages([{ amount: "", deliverables: "" }]);
      setPackageCount(1);
    }

    setIsEventFormOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        alert("Event deleted successfully!");
        loadEvents(); // Reload the events list
      } else {
        alert(result.message || "Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleViewPackageStatus = async (event: Event) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/events/${event._id}/interested-sponsors`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();
      if (result.success) {
        setInterestedSponsors(result.packages);
        setSelectedEventForSponsors(event);
        setIsInterestedSponsorsOpen(true);
      } else {
        alert(result.message || "Failed to load package status");
      }
    } catch (error) {
      console.error("Error loading package status:", error);
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

  const getStatusColor = (status: string) => {
    const colors = {
      draft: "bg-gray-500",
      published: "bg-blue-500",
      sponsored: "bg-green-500",
      completed: "bg-purple-500",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Organizer Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {user?.clubName}, {user?.collegeName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNotificationOpen(true)}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadNotifications}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Side Panel */}
        <aside className="w-80 border-r bg-muted/30 min-h-[calc(100vh-64px)]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Event Management</h2>
              <Button onClick={() => setIsEventFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Quick Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Events
                      </span>
                      <span>{events.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Published</span>
                      <span>
                        {events.filter((e) => e.status === "published").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Interest Received
                      </span>
                      <span>
                        {events.reduce(
                          (sum, e) => sum + e.interestedSponsors,
                          0,
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Sponsor Connection</h3>
                </div>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Building2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Connect with sponsors to fund your events
                    </p>
                    <Link to="/sponsors">
                      <Button className="w-full">
                        <Building2 className="h-4 w-4 mr-2" />
                        View Sponsors
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Your Events</h2>
            <p className="text-muted-foreground">
              Manage your events and track sponsorship opportunities
            </p>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <Card
                key={event._id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {event.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={`${getStatusColor(event.status)} text-white`}
                        >
                          {event.status}
                        </Badge>
                        {event.interestedSponsors > 0 && (
                          <Badge variant="outline">
                            {event.interestedSponsors} interested
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm line-clamp-2">{event.description}</p>

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
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewPackageStatus(event)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Package Status
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditEvent(event)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>

      {/* New Event Form Modal */}
      <Dialog open={isEventFormOpen} onOpenChange={setIsEventFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Create New Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={eventForm.title}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={eventForm.category}
                    onValueChange={(value) =>
                      setEventForm({ ...eventForm, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Event Date *</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventForm.eventDate}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, eventDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue *</Label>
                  <Input
                    id="venue"
                    value={eventForm.venue}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, venue: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedAttendees">
                    Expected Attendees *
                  </Label>
                  <Input
                    id="expectedAttendees"
                    type="number"
                    value={eventForm.expectedAttendees}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        expectedAttendees: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Sponsorship Packages *</Label>
                  <Select
                    value={packageCount.toString()}
                    onValueChange={(value) =>
                      handlePackageCountChange(parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select number of packages" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} Package{num > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Package Creation Fields */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Sponsorship Packages
                </Label>
                {packages.map((pkg, index) => (
                  <Card key={index} className="p-4">
                    <h4 className="font-medium mb-3">Package {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`amount-${index}`}>Amount (₹) *</Label>
                        <Input
                          id={`amount-${index}`}
                          type="number"
                          placeholder="e.g., 50000"
                          value={pkg.amount}
                          onChange={(e) =>
                            handlePackageChange(index, "amount", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`deliverables-${index}`}>
                          Deliverables *
                        </Label>
                        <Input
                          id={`deliverables-${index}`}
                          placeholder="e.g., Logo placement, booth space"
                          value={pkg.deliverables}
                          onChange={(e) =>
                            handlePackageChange(
                              index,
                              "deliverables",
                              e.target.value,
                            )
                          }
                          required
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brochure">Event Brochure (PDF)</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF files only
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1">
                  {editingEvent ? "Update Event" : "Create Event"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Modal */}
      <Dialog open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sponsor Interest Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No new notifications
              </p>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification._id}
                  className="border-l-4 border-l-primary"
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">
                          {notification.sponsorName}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Interested in: {notification.eventTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>

                      <p className="text-sm">{notification.message}</p>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleNotificationResponse(
                              notification._id,
                              "accept",
                            )
                          }
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleNotificationResponse(
                              notification._id,
                              "decline",
                            )
                          }
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Status Modal */}
      <Dialog
        open={isInterestedSponsorsOpen}
        onOpenChange={setIsInterestedSponsorsOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Package Status - {selectedEventForSponsors?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {interestedSponsors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No packages found for this event
              </p>
            ) : (
              interestedSponsors.map((pkg: any) => (
                <Card
                  key={pkg.packageNumber}
                  className="border-l-4 border-l-primary"
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-lg">
                            Package {pkg.packageNumber}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {pkg.deliverables}
                          </p>
                          <p className="text-lg font-semibold text-primary mt-1">
                            {formatCurrency(pkg.amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={`${
                              pkg.status === "selected"
                                ? "bg-green-500"
                                : pkg.interestCount > 0
                                  ? "bg-blue-500"
                                  : "bg-gray-500"
                            } text-white`}
                          >
                            {pkg.status === "selected"
                              ? "Selected"
                              : pkg.interestCount > 0
                                ? `${pkg.interestCount} Interested`
                                : "Available"}
                          </Badge>
                        </div>
                      </div>

                      {/* Show agent assignment status */}
                      {pkg.agentAssigned && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              Agent Assigned: {pkg.agentName}
                            </span>
                          </div>
                          {pkg.dealStatus && (
                            <div className="mt-2">
                              <Badge
                                className={`${
                                  pkg.dealStatus === "negotiating"
                                    ? "bg-yellow-500 text-white"
                                    : pkg.dealStatus === "approved"
                                      ? "bg-blue-500 text-white"
                                      : pkg.dealStatus === "signed"
                                        ? "bg-purple-500 text-white"
                                        : pkg.dealStatus === "completed"
                                          ? "bg-green-600 text-white"
                                          : "bg-gray-500 text-white"
                                }`}
                              >
                                Deal Status:{" "}
                                {pkg.dealStatus.charAt(0).toUpperCase() +
                                  pkg.dealStatus.slice(1)}
                              </Badge>
                            </div>
                          )}
                          {pkg.selectedSponsorCompany && (
                            <p className="text-xs text-green-600 mt-1">
                              Selected Sponsor: {pkg.selectedSponsorCompany}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Show interest without revealing sponsor names */}
                      {pkg.interestCount > 0 && !pkg.agentAssigned && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">
                              {pkg.interestCount} sponsor
                              {pkg.interestCount > 1 ? "s" : ""} interested
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            Sponsors have shown interest - automatic agent
                            assignment will occur when sponsor confirms
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
