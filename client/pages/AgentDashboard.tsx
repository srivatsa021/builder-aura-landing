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
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageCircle,
  Calendar,
  DollarSign,
  Building2,
  Users,
  Eye,
  Send,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

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
  const [pendingDeals, setPendingDeals] = useState<Deal[]>([]);
  const [myDeals, setMyDeals] = useState<Deal[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Load pending deals and my assigned deals
    loadPendingDeals();
    loadMyDeals();
  }, []);

  const loadPendingDeals = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/deals/pending", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        console.log("📋 Loaded pending deals:", result.deals);
        setPendingDeals(result.deals);
      } else {
        console.error("Failed to load pending deals:", result.message);
      }
    } catch (error) {
      console.error("Error loading pending deals:", error);
    }
  };

  const loadMyDeals = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/deals/my", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        console.log("📋 Loaded my deals:", result.deals);
        setMyDeals(result.deals);
      } else {
        console.error("Failed to load my deals:", result.message);
      }
    } catch (error) {
      console.error("Error loading my deals:", error);
    }
  };

  const handleAssignToDeal = async (dealId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/deals/${dealId}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        alert("Successfully assigned to deal! You can now begin negotiations.");
        // Reload pending deals and my deals
        loadPendingDeals();
        loadMyDeals();
      } else {
        alert(result.message || "Failed to assign to deal");
      }
    } catch (error) {
      console.error("Error assigning to deal:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleUpdateDealStatus = async (
    dealId: string,
    newStatus: Deal["status"],
  ) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/deals/${dealId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (result.success) {
        setMyDeals((prev) =>
          prev.map((deal) =>
            deal._id === dealId ? { ...deal, status: newStatus } : deal,
          ),
        );

        const statusMessages = {
          approved:
            "Deal approved! Both sponsor and organizer have been notified.",
          signed: "Deal signed! Both parties will see the updated status.",
          completed: "Deal completed successfully! Congratulations!",
        };

        alert(
          statusMessages[newStatus as keyof typeof statusMessages] ||
            `Deal status updated to: ${newStatus}`,
        );
      } else {
        alert(result.message || "Failed to update deal status");
      }
    } catch (error) {
      console.error("Error updating deal status:", error);
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
        return selectedDeal?.sponsor.contactPerson || "Sponsor";
      case "organizer":
        return selectedDeal?.event.organizer || "Organizer";
      case "agent":
        return user?.name || "Agent";
      default:
        return "Unknown";
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Deals</p>
                  <p className="text-2xl font-bold">
                    {
                      myDeals.filter((d) =>
                        ["pending", "negotiating"].includes(d.status),
                      ).length
                    }
                  </p>
                </div>
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {myDeals.filter((d) => d.status === "completed").length}
                  </p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      myDeals.reduce((sum, deal) => sum + deal.amount, 0),
                    )}
                  </p>
                </div>
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">85%</p>
                </div>
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Deals Section */}
        {pendingDeals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Available Deals</h2>
            <p className="text-muted-foreground mb-6">
              Assign yourself to mediate these sponsorship deals
            </p>

            <div className="grid gap-4">
              {pendingDeals.map((deal) => (
                <Card key={deal._id} className="border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                          {deal.event.title}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-1">
                              Sponsor
                            </h4>
                            <p className="font-medium">
                              {deal.sponsor.companyName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Contact: {deal.sponsor.name}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-1">
                              Organizer
                            </h4>
                            <p className="font-medium">
                              {deal.organizer.clubName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {deal.organizer.collegeName} •{" "}
                              {deal.organizer.name}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-1">
                              Package Details
                            </h4>
                            <p className="font-medium">
                              Package {deal.packageId.packageNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(deal.packageId.amount)} •{" "}
                              {deal.packageId.deliverables}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => handleAssignToDeal(deal._id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Assign Myself
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">My Assigned Deals</h2>
          <p className="text-muted-foreground">
            Manage sponsorship agreements you're mediating
          </p>
        </div>

        {/* Deals List */}
        <div className="space-y-6">
          {myDeals.map((deal) => (
            <Card key={deal._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {deal.event.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={`${getStatusColor(deal.status)} text-white`}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(deal.status)}
                          {deal.status}
                        </span>
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Deal Value</p>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(deal.amount)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Event Details */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Event Details</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(deal.event.eventDate)}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {deal.organizer.clubName}, {deal.organizer.collegeName}
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Package {deal.packageId.packageNumber} •{" "}
                        {deal.packageId.deliverables}
                      </div>
                    </div>
                  </div>

                  {/* Sponsor Details */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Sponsor Details</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2" />
                        {deal.sponsor.companyName}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {deal.sponsor.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deal Description */}
                {deal.description && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Deal Details</p>
                    <p className="text-sm text-muted-foreground">
                      {deal.description}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {deal.status === "negotiating" && (
                    <Button
                      onClick={() =>
                        handleUpdateDealStatus(deal._id, "approved")
                      }
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Deal
                    </Button>
                  )}

                  {deal.status === "approved" && (
                    <Button
                      onClick={() => handleUpdateDealStatus(deal._id, "signed")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Mark as Signed
                    </Button>
                  )}

                  {deal.status === "signed" && (
                    <Button
                      onClick={() =>
                        handleUpdateDealStatus(deal._id, "completed")
                      }
                      variant="outline"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Completed
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
