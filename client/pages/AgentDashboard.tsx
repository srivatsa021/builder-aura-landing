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
    title: string;
    eventDate: string;
    organizer: string;
    college: string;
  };
  sponsor: {
    companyName: string;
    contactPerson: string;
  };
  proposedAmount: number;
  currentAmount?: number;
  status:
    | "pending"
    | "negotiating"
    | "approved"
    | "signed"
    | "completed"
    | "cancelled";
  assignedDate: string;
  lastActivity: string;
}

interface ChatMessage {
  _id: string;
  from: "sponsor" | "organizer" | "agent";
  message: string;
  timestamp: string;
  amount?: number;
}

export default function AgentDashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Load deals (mock data for now)
    setDeals([
      {
        _id: "1",
        event: {
          title: "TechFest 2024",
          eventDate: "2024-03-15",
          organizer: "Rajesh Kumar",
          college: "IIT Mumbai",
        },
        sponsor: {
          companyName: "Tech Innovators Pvt Ltd",
          contactPerson: "John Smith",
        },
        proposedAmount: 500000,
        currentAmount: 450000,
        status: "negotiating",
        assignedDate: "2024-01-08",
        lastActivity: "2024-01-10",
      },
      {
        _id: "2",
        event: {
          title: "Cultural Carnival",
          eventDate: "2024-02-20",
          organizer: "Priya Sharma",
          college: "Delhi University",
        },
        sponsor: {
          companyName: "Green Energy Solutions",
          contactPerson: "Sarah Johnson",
        },
        proposedAmount: 300000,
        status: "pending",
        assignedDate: "2024-01-10",
        lastActivity: "2024-01-10",
      },
      {
        _id: "3",
        event: {
          title: "Innovation Summit",
          eventDate: "2024-04-10",
          organizer: "Arjun Patel",
          college: "NIT Trichy",
        },
        sponsor: {
          companyName: "Digital Marketing Hub",
          contactPerson: "Mike Wilson",
        },
        proposedAmount: 400000,
        currentAmount: 400000,
        status: "approved",
        assignedDate: "2024-01-05",
        lastActivity: "2024-01-09",
      },
    ]);
  }, []);

  const handleOpenChat = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsChatOpen(true);

    // Load chat messages for this deal (mock data)
    setChatMessages([
      {
        _id: "1",
        from: "sponsor",
        message:
          "We're interested in sponsoring this event. Can we discuss the sponsorship package details?",
        timestamp: "2024-01-08T10:00:00Z",
      },
      {
        _id: "2",
        from: "organizer",
        message:
          "Great! We have different sponsorship tiers available. The premium package includes logo placement, booth space, and speaking opportunities.",
        timestamp: "2024-01-08T11:30:00Z",
      },
      {
        _id: "3",
        from: "agent",
        message:
          "Hello both! I'm assigned as your deal mediator. Let's discuss the terms and find a mutually beneficial agreement.",
        timestamp: "2024-01-08T14:00:00Z",
      },
      {
        _id: "4",
        from: "sponsor",
        message:
          "The proposed amount seems high. Can we negotiate to ₹4,50,000?",
        timestamp: "2024-01-09T09:15:00Z",
        amount: 450000,
      },
      {
        _id: "5",
        from: "organizer",
        message:
          "We can consider ₹4,50,000 if we include additional promotional activities.",
        timestamp: "2024-01-09T15:45:00Z",
      },
    ]);
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedDeal) {
      const message: ChatMessage = {
        _id: Date.now().toString(),
        from: "agent",
        message: newMessage,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, message]);
      setNewMessage("");

      // TODO: Send message to API
    }
  };

  const handleUpdateDealStatus = (
    dealId: string,
    newStatus: Deal["status"],
  ) => {
    setDeals((prev) =>
      prev.map((deal) =>
        deal._id === dealId ? { ...deal, status: newStatus } : deal,
      ),
    );

    // TODO: Update deal status via API
    alert(`Deal status updated to: ${newStatus}`);
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
                      deals.filter((d) =>
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
                    {deals.filter((d) => d.status === "completed").length}
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
                      deals.reduce(
                        (sum, deal) =>
                          sum + (deal.currentAmount || deal.proposedAmount),
                        0,
                      ),
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

        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Active Deals</h2>
          <p className="text-muted-foreground">
            Manage and mediate sponsorship agreements
          </p>
        </div>

        {/* Deals List */}
        <div className="space-y-6">
          {deals.map((deal) => (
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
                      {formatCurrency(
                        deal.currentAmount || deal.proposedAmount,
                      )}
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
                        {deal.event.organizer}, {deal.event.college}
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
                        {deal.sponsor.contactPerson}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deal Progress */}
                {deal.proposedAmount !== deal.currentAmount && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">
                      Negotiation Progress
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        Original: {formatCurrency(deal.proposedAmount)}
                      </span>
                      <span>→</span>
                      <span className="text-primary">
                        Current:{" "}
                        {formatCurrency(
                          deal.currentAmount || deal.proposedAmount,
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleOpenChat(deal)}
                    className="flex-1"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Open Chat
                  </Button>

                  {deal.status === "negotiating" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleUpdateDealStatus(deal._id, "approved")
                      }
                    >
                      Mark Approved
                    </Button>
                  )}

                  {deal.status === "approved" && (
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateDealStatus(deal._id, "signed")}
                    >
                      Mark Signed
                    </Button>
                  )}

                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chat Modal */}
        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            {selectedDeal && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    Deal Communication: {selectedDeal.event.title}
                  </DialogTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {selectedDeal.sponsor.companyName} ↔{" "}
                      {selectedDeal.event.college}
                    </span>
                    <Badge
                      className={`${getStatusColor(selectedDeal.status)} text-white`}
                    >
                      {selectedDeal.status}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="flex flex-col h-[60vh]">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/30">
                    {chatMessages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex gap-3 ${message.from === "agent" ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            className={`text-xs ${
                              message.from === "sponsor"
                                ? "bg-blue-500"
                                : message.from === "organizer"
                                  ? "bg-green-500"
                                  : "bg-primary"
                            } text-white`}
                          >
                            {getSenderInitials(message.from)}
                          </AvatarFallback>
                        </Avatar>

                        <div
                          className={`flex-1 ${message.from === "agent" ? "text-right" : ""}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-medium">
                              {getSenderName(message.from)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          </div>

                          <div
                            className={`inline-block p-3 rounded-lg max-w-xs ${
                              message.from === "agent"
                                ? "bg-primary text-primary-foreground ml-auto"
                                : "bg-background border"
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            {message.amount && (
                              <div className="mt-2 pt-2 border-t border-current/20">
                                <p className="text-xs font-medium">
                                  Proposed Amount:{" "}
                                  {formatCurrency(message.amount)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="mt-4 flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
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
