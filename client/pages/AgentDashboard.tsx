import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Fix imports: only icons from lucide-react
import { Eye, CheckCircle, Edit, Trash2, Users, UserPlus, MessageCircle, Clock, FileText, AlertCircle, Calendar, DollarSign, Building2 } from "lucide-react";
// Tabs components from your UI library
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Deal {
  _id: string;
  event: {
    _id: string;
    title: string;
    eventDate: string;
  };
  sponsor: {
    _id: string;
    name: string;
    companyName: string;
  };
  organizer: {
    _id: string;
    name: string;
    clubName: string;
    collegeName: string;
  };
  packageId: {
    _id: string;
    packageNumber: number;
    amount: number;
    deliverables: string;
  };
  amount: number;
  description?: string;
  status:
    | "pending"
    | "negotiating"
    | "approved"
    | "signed"
    | "completed"
    | "cancelled";
  createdAt: string;
  agent?: string;
}

interface ChatMessage {
  _id: string;
  from: "sponsor" | "organizer" | "agent";
  message: string;
  timestamp: string;
  amount?: number;
}

export default function AgentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [eventSponsors, setEventSponsors] = useState<Record<string, any[]>>({});
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<any | null>(null);
  const [eventToDelete, setEventToDelete] = useState<any | null>(null);
  const [pendingSponsors, setPendingSponsors] = useState<any[]>([]);

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Load all events
    loadAllEvents();
    loadPendingSponsors();
  }, []);

  const loadAllEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/events", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        console.log("📋 Loaded events:", result.events);
        setAllEvents(result.events);
        
        // Load sponsor interest for each event
        await loadEventSponsors(result.events);
      } else {
        console.error("Failed to load events:", result.message);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

    const loadEventSponsors = async (events: any[]) => {
    try {
      const token = localStorage.getItem("token");
      const sponsorsData: Record<string, any[]> = {};
      
      for (const event of events) {
        try {
          const response = await fetch(`/api/events/${event._id}/packages`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          const result = await response.json();
          console.log(`📦 Packages for event ${event._id}:`, result);
          if (result.success) {
            sponsorsData[event._id] = result.packages;
            console.log(`✅ Loaded ${result.packages.length} packages for event ${event._id}`);
          } else {
            console.error(`❌ Failed to load packages for event ${event._id}:`, result.message);
            sponsorsData[event._id] = [];
          }
        } catch (error) {
          console.error(`Error loading packages for event ${event._id}:`, error);
          sponsorsData[event._id] = [];
        }
      }
      
      setEventSponsors(sponsorsData);
    } catch (error) {
      console.error("Error loading event sponsors:", error);
    }
  };

  const fetchOrganizerDetails = async (organizerId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${organizerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        return result.user;
      }
    } catch (error) {
      console.error("Error fetching organizer details:", error);
    }
    return null;
  };

  const enrichEventWithOrganizerDetails = async (event: any) => {
    // If organizer details are missing, fetch them
    if (!event.organizer?.email || !event.organizer?.phone || !event.organizer?.name) {
      console.log("��� Fetching missing organizer details for event:", event._id);
      const organizerDetails = await fetchOrganizerDetails(event.organizer?._id || event.organizer);
      if (organizerDetails) {
        event.organizer = {
          _id: organizerDetails._id,
          name: organizerDetails.name || 'N/A',
          email: organizerDetails.email || 'N/A',
          phone: organizerDetails.phone || 'N/A',
          clubName: organizerDetails.clubName || 'N/A',
          collegeName: organizerDetails.collegeName || 'N/A'
        };
        console.log("✅ Enriched event with organizer details:", event.organizer);
      }
    }
    return event;
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
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-500",
      negotiating: "bg-blue-500",
      approved: "bg-green-500",
      signed: "bg-purple-500",
      completed: "bg-emerald-500",
      cancelled: "bg-red-500",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  const loadPendingSponsors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/sponsors/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPendingSponsors(data.applications || []);
    } catch (e) {
      console.error("Failed to load pending sponsors", e);
    }
  };

  const approveSponsorApp = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/sponsors/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert("Sponsor approved.");
        loadPendingSponsors();
      } else {
        alert(data.message || "Approval failed");
      }
    } catch (e) {
      alert("Approval failed");
    }
  };

  const rejectSponsorApp = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/sponsors/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert("Sponsor rejected.");
        loadPendingSponsors();
      } else {
        alert(data.message || "Rejection failed");
      }
    } catch (e) {
      alert("Rejection failed");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "negotiating":
        return <MessageCircle className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "signed":
        return <FileText className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getSenderInitials = (from: string) => {
    switch (from) {
      case "sponsor":
        return "SP";
      case "organizer":
        return "OR";
      case "agent":
        return "AG";
      default:
        return "??";
    }
  };

  const getSenderName = (from: string) => {
    switch (from) {
      case "sponsor":
        return selectedEvent?.sponsor?.name || selectedEvent?.event?.sponsor?.name || "Sponsor";
      case "organizer":
        return selectedEvent?.organizer?.name || selectedEvent?.event?.organizer?.name || "Organizer";
      case "agent":
        return user?.name || "Agent";
      default:
        return "Unknown";
    }
  };

  // Calculate stats
  const totalEvents = allEvents.length;
  const totalInterest = allEvents.reduce((sum, event) => {
    const pkgs = eventSponsors[event._id] || [];
    return sum + pkgs.reduce((pkgSum: number, pkg: any) => pkgSum + pkg.interestedSponsors.length, 0);
  }, 0);

  // Filter events with interest
  const eventsWithInterest = allEvents.filter(event => {
    const pkgs = eventSponsors[event._id] || [];
    return pkgs.some((pkg: any) => pkg.interestedSponsors?.length > 0);
  });


  const handleAssignToEvent = async (event: any) => {
    try {
      // Find the pending deal for this event
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/deals/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        const deal = result.deals.find((d: any) => d.event._id === event._id);
        if (deal) {
          const assignRes = await fetch(`/api/deals/${deal._id}/assign`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const assignResult = await assignRes.json();
          if (assignResult.success) {
            alert("Successfully assigned to event!");
            loadAllEvents();
          } else {
            alert(assignResult.message || "Failed to assign to event");
          }
        } else {
          alert("No pending deal found for this event.");
        }
      } else {
        alert("Failed to fetch pending deals.");
      }
    } catch (error) {
      alert("Error assigning to event.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <MessageCircle className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Agent Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Mediating sponsorship deals
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
        {/* Welcome Message */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Welcome, Admin Agent!</h1>
          <p className="text-muted-foreground text-lg">Manage events and track sponsor interest across the platform</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="rounded-lg p-6 bg-red-600 text-white shadow">
            <div className="text-2xl font-bold">{totalEvents}</div>
            <div className="text-sm mt-2">Total Events</div>
                </div>
          <div className="rounded-lg p-6 bg-green-600 text-white shadow">
            <div className="text-2xl font-bold">{eventsWithInterest.length}</div>
            <div className="text-sm mt-2">Events with Interest</div>
              </div>
          <div className="rounded-lg p-6 bg-blue-600 text-white shadow">
            <div className="text-2xl font-bold">{totalInterest}</div>
            <div className="text-sm mt-2">Total Interest</div>
              </div>
        </div>

        {/* Tabbed Event Table Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              <span className="flex items-center"><Users className="h-4 w-4 mr-1" /> ALL EVENTS ({allEvents.length})</span>
            </TabsTrigger>
            <TabsTrigger value="with-interest">
              <span className="flex items-center"><MessageCircle className="h-4 w-4 mr-1" /> EVENTS WITH INTEREST ({eventsWithInterest.length})</span>
            </TabsTrigger>
            <TabsTrigger value="pending-sponsors">
              <span className="flex items-center"><Building2 className="h-4 w-4 mr-1" /> PENDING SPONSORS ({pendingSponsors.length})</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <div className="overflow-x-auto rounded-lg bg-card p-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-muted-foreground">
                    <th className="py-2 px-3">Event Name</th>
                    <th className="py-2 px-3">Club</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Sponsor Interest</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">No Events Available</td>
                    </tr>
                  ) : (
                    allEvents.map(event => {
                      const pkgs = eventSponsors[event._id] || [];
                      const sponsorCount = pkgs.reduce((sum: number, pkg: any) => sum + pkg.interestedSponsors.length, 0);
                      return (
                        <tr key={event._id} className="border-b border-muted-foreground hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium">
                            <span onClick={async () => {
                              const enrichedEvent = await enrichEventWithOrganizerDetails(event);
                              setSelectedEvent(enrichedEvent);
                              setShowEventModal(true);
                            }} className="cursor-pointer hover:underline">{event.title}</span>
                            <div className="text-xs text-muted-foreground">{event.organizer?.collegeName}</div>
                          </td>
                          <td className="py-2 px-3">{event.organizer?.clubName}</td>
                          <td className="py-2 px-3"><span className="inline-block rounded px-2 py-1 bg-yellow-600 text-white text-xs">Unassigned</span></td>
                          <td className="py-2 px-3"><span className="inline-block rounded px-2 py-1 bg-blue-600 text-white text-xs">{sponsorCount} sponsors</span></td>
                          <td className="py-2 px-3 flex gap-2">
                            <button title="View" onClick={async () => {
                              const enrichedEvent = await enrichEventWithOrganizerDetails(event);
                              setSelectedEvent(enrichedEvent);
                              setShowEventModal(true);
                            }} className="hover:text-primary"><Eye className="h-4 w-4" /></button>
                            <button title="Assign" onClick={() => handleAssignToEvent(event)} className="hover:text-green-500"><UserPlus className="h-4 w-4" /></button>
                            <button title="Edit" onClick={() => { setEventToEdit(event); setShowEditModal(true); }} className="hover:text-green-500"><Edit className="h-4 w-4" /></button>
                            <button title="Delete" onClick={() => { setEventToDelete(event); setShowDeleteModal(true); }} className="hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="with-interest">
            <div className="overflow-x-auto rounded-lg bg-card p-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-muted-foreground">
                    <th className="py-2 px-3">Event Name</th>
                    <th className="py-2 px-3">Club</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Sponsor Interest</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsWithInterest.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">No Events with Sponsor Interest</td>
                    </tr>
                  ) : (
                    eventsWithInterest.map(event => {
                      const pkgs = eventSponsors[event._id] || [];
                      const sponsorCount = pkgs.reduce((sum: number, pkg: any) => sum + pkg.interestedSponsors.length, 0);
                      return (
                        <tr key={event._id} className="border-b border-muted-foreground hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium">
                            <span onClick={async () => {
                              const enrichedEvent = await enrichEventWithOrganizerDetails(event);
                              setSelectedEvent(enrichedEvent);
                              setShowEventModal(true);
                            }} className="cursor-pointer hover:underline">{event.title}</span>
                            <div className="text-xs text-muted-foreground">{event.organizer?.collegeName}</div>
                          </td>
                          <td className="py-2 px-3">{event.organizer?.clubName}</td>
                          <td className="py-2 px-3"><span className="inline-block rounded px-2 py-1 bg-yellow-600 text-white text-xs">Unassigned</span></td>
                          <td className="py-2 px-3"><span className="inline-block rounded px-2 py-1 bg-blue-600 text-white text-xs">{sponsorCount} sponsors</span></td>
                          <td className="py-2 px-3 flex gap-2">
                            <button title="View" onClick={async () => {
                              const enrichedEvent = await enrichEventWithOrganizerDetails(event);
                              setSelectedEvent(enrichedEvent);
                              setShowEventModal(true);
                            }} className="hover:text-primary"><Eye className="h-4 w-4" /></button>
                            <button title="Assign" onClick={() => handleAssignToEvent(event)} className="hover:text-green-500"><UserPlus className="h-4 w-4" /></button>
                            <button title="Edit" onClick={() => { setEventToEdit(event); setShowEditModal(true); }} className="hover:text-green-500"><Edit className="h-4 w-4" /></button>
                            <button title="Delete" onClick={() => { setEventToDelete(event); setShowDeleteModal(true); }} className="hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="pending-sponsors">
            <div className="overflow-x-auto rounded-lg bg-card p-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-muted-foreground">
                    <th className="py-2 px-3">Company</th>
                    <th className="py-2 px-3">GST</th>
                    <th className="py-2 px-3">Contact</th>
                    <th className="py-2 px-3">Industry</th>
                    <th className="py-2 px-3">Submitted</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSponsors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">No pending applications</td>
                    </tr>
                  ) : (
                    pendingSponsors.map((app) => (
                      <tr key={app.id} className="border-b border-muted-foreground hover:bg-muted/30">
                        <td className="py-2 px-3">
                          <div className="font-medium">{app.companyName}</div>
                          <div className="text-xs text-muted-foreground">{app.name} • {app.email}</div>
                        </td>
                        <td className="py-2 px-3">{app.gstNumber}</td>
                        <td className="py-2 px-3">{app.phone}</td>
                        <td className="py-2 px-3">{app.industry}</td>
                        <td className="py-2 px-3">{new Date(app.submittedAt).toLocaleString()}</td>
                        <td className="py-2 px-3 flex gap-2">
                          <button className="px-2 py-1 rounded bg-green-600 text-white" onClick={() => approveSponsorApp(app.id)}>Approve</button>
                          <button className="px-2 py-1 rounded bg-red-600 text-white" onClick={() => rejectSponsorApp(app.id)}>Reject</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Event Details Modal */}
        <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-6">
                {/* Event Information */}
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">{selectedEvent.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{selectedEvent.eventDate}</p>
                          </div>
                          <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{selectedEvent.location}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{selectedEvent.description}</p>
                    </div>
                  </div>
                </div>

                {/* Organizer Information */}
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Organizer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedEvent.organizer?.name || "N/A"}</p>
                      </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedEvent.organizer?.email || "N/A"}</p>
                      </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedEvent.organizer?.phone || "N/A"}</p>
                      </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Club</p>
                      <p className="font-medium">{selectedEvent.organizer?.clubName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">College</p>
                      <p className="font-medium">{selectedEvent.organizer?.collegeName || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Sponsor Interest */}
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Sponsor Interest</h3>
                  {eventSponsors[selectedEvent._id]?.length ? (
                    <div className="space-y-4">
                      {eventSponsors[selectedEvent._id].map((pkg: any) => (
                        <div key={pkg._id} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Package {pkg.packageNumber} - {formatCurrency(pkg.amount)}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{pkg.deliverables}</p>
                          
                          {pkg.interestedSponsors?.length ? (
                            <div className="space-y-3">
                              <h5 className="font-medium text-sm">Interested Sponsors:</h5>
                              {pkg.interestedSponsors.map((sponsor: any) => (
                                <div key={sponsor._id} className="bg-background p-3 rounded border">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Name</p>
                                      <p className="font-medium">{sponsor.name || "N/A"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Company</p>
                                      <p className="font-medium">{sponsor.companyName || "N/A"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Email</p>
                                      <p className="font-medium">{sponsor.email || "N/A"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Phone</p>
                                      <p className="font-medium">{sponsor.phone || "N/A"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Industry</p>
                                      <p className="font-medium">{sponsor.industry || "N/A"}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                  </div>
                          ) : (
                            <p className="text-muted-foreground">No sponsors interested in this package yet.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No sponsor interest yet.</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Modal (UI only) */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Event (UI only)</DialogTitle>
              <DialogDescription>
                Edit functionality is coming soon. This modal is for UI demonstration purposes.
              </DialogDescription>
            </DialogHeader>
            <div className="text-muted-foreground">Edit functionality coming soon.</div>
            <div className="flex justify-end mt-6">
              <button className="px-4 py-2 rounded border border-muted-foreground text-muted-foreground hover:bg-muted" onClick={() => setShowEditModal(false)}>Close</button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Modal (UI only) */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Event</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this event? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="text-muted-foreground">Are you sure you want to delete this event? This action cannot be undone.</div>
            <div className="flex justify-end mt-6 gap-2">
              <button className="px-4 py-2 rounded border border-muted-foreground text-muted-foreground hover:bg-muted" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded border border-red-500 text-white bg-red-500 hover:bg-red-600" onClick={() => { setShowDeleteModal(false); alert('Delete functionality coming soon.'); }}>Delete</button>
        </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
