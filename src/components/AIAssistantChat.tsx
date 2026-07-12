import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, Send, X, MessageSquare, Image, Calendar, 
  DollarSign, Check, Loader2, AlertCircle, Laptop, Tag, Hash, FileText
} from "lucide-react";
import { User, AssetCategory, AssetCondition } from "../types.js";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string;
  draft?: {
    name: string;
    categoryName: string;
    purchaseCost: number;
    serialNumber: string;
    specs: string;
  };
  imagePreview?: string;
}

interface AIAssistantChatProps {
  user: User;
  onAssetRegistered: () => void;
}

export default function AIAssistantChat({ user, onAssetRegistered }: AIAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Hello! I am your agentic **AI Asset Assistant**. 🚀\n\nI can register devices automatically! Try uploading a photo of any device (or drag-and-drop), or type something like:\n*\"Register a MacBook Pro costing 2200\"*",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  
  // Image registration flow states
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImageMime, setSelectedImageMime] = useState<string | null>(null);

  // Registration draft states (for editing the draft in-chat)
  const [activeDraft, setActiveDraft] = useState<any | null>(null);
  const [draftPurchaseDate, setDraftPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [draftLocation, setDraftLocation] = useState("HQ Office");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState<string | null>(null);
  const [registerErrorMsg, setRegisterErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch categories for mapping/dropdown
  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error("Failed to load categories in chat", err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, analyzingImage]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = input.trim();
    if (!userText || isSending) return;

    // Clear message draft visual
    setActiveDraft(null);
    setRegisterSuccessMsg(null);
    setRegisterErrorMsg(null);

    // Append user message
    const userMsgId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      // Package conversation history (last 5 messages)
      const chatHistory = messages.slice(-5).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: chatHistory })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Chat failed");
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "ai",
        text: data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        draft: data.hasDraft ? data.draft : undefined
      };

      setMessages(prev => [...prev, botMsg]);

      if (data.hasDraft && data.draft) {
        setActiveDraft(data.draft);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: "ai",
          text: `⚠️ **AI Service Error:** ${err.message || "Failed to communicate with AI model. Please ensure GEMINI_API_KEY is configured."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Handle uploading device image for analysis
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingImage(true);
    setRegisterSuccessMsg(null);
    setRegisterErrorMsg(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setImagePreviewUrl(base64String);
      setSelectedImageBase64(base64String);
      setSelectedImageMime(file.type);

      // Append image preview message
      const userImgMsg: ChatMessage = {
        id: `msg-img-${Date.now()}`,
        role: "user",
        text: `Uploaded photo of device for AI registration`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imagePreview: base64String
      };
      setMessages(prev => [...prev, userImgMsg]);

      try {
        const res = await fetch("/api/ai/analyze-device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64String,
            mimeType: file.type
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Device image analysis failed");
        }

        const botAnalysisMsg: ChatMessage = {
          id: `msg-bot-img-${Date.now()}`,
          role: "ai",
          text: `🔍 **I've analyzed the device image!** Here is the structured draft specifications I captured. Adjust the purchase date and confirm below.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          draft: data
        };

        setMessages(prev => [...prev, botAnalysisMsg]);
        setActiveDraft(data);
      } catch (err: any) {
        setMessages(prev => [
          ...prev,
          {
            id: `msg-err-${Date.now()}`,
            role: "ai",
            text: `❌ **AI Analysis Failed:** ${err.message || "Could not process image."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } finally {
        setAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit dynamic draft registration
  const handleConfirmRegistration = async () => {
    if (!activeDraft) return;
    setIsRegistering(true);
    setRegisterErrorMsg(null);
    setRegisterSuccessMsg(null);

    try {
      // 1. Resolve or create Category
      let resolvedCategoryId = "";
      const existingCat = categories.find(
        c => c.name.toLowerCase() === activeDraft.categoryName.toLowerCase()
      );

      if (existingCat) {
        resolvedCategoryId = existingCat.id;
      } else {
        // Create new category dynamically to solve blank categories
        const catRes = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: activeDraft.categoryName,
            actorUserId: user.id
          })
        });
        const catData = await catRes.json();
        if (!catRes.ok) {
          throw new Error(catData.error || "Failed to create category");
        }
        resolvedCategoryId = catData.id;
        setCategories(prev => [...prev, catData]);
      }

      // 2. Register hardware asset device
      const assetRes = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeDraft.name,
          categoryId: resolvedCategoryId,
          serialNumber: activeDraft.serialNumber || `SN-${Date.now()}`,
          condition: AssetCondition.EXCELLENT,
          location: draftLocation,
          purchaseDate: draftPurchaseDate,
          purchaseCost: parseFloat(activeDraft.purchaseCost) || 0,
          isShared: false,
          image: imagePreviewUrl || undefined,
          actorUserId: user.id
        })
      });

      const assetData = await assetRes.json();
      if (!assetRes.ok) {
        throw new Error(assetData.error || "Registration failed");
      }

      setRegisterSuccessMsg(`Successfully registered ${assetData.name}! Tag allocated: ${assetData.tag}`);
      onAssetRegistered();
      setActiveDraft(null);
      setImagePreviewUrl(null);
      setSelectedImageBase64(null);

      // Append success message from AI
      setMessages(prev => [
        ...prev,
        {
          id: `msg-success-${Date.now()}`,
          role: "ai",
          text: `🎉 **Successfully Registered!**\n\nThe asset **${assetData.name}** has been recorded in inventory under Tag: **${assetData.tag}** with Category: **${activeDraft.categoryName}**.\n\nEverything is up to date!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setRegisterErrorMsg(err.message || "Failed to complete asset registration");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="ai-assistant-fab"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center cursor-pointer group z-50 hover:scale-105"
        title="AI Registration Assistant"
      >
        <Sparkles className="h-6 w-6 animate-pulse text-yellow-200 group-hover:rotate-12 transition-transform" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out text-xs font-bold text-white pl-0 group-hover:pl-2 whitespace-nowrap">
          AI Register
        </span>
      </button>

      {/* Floating Drawer / Dialog */}
      {isOpen && (
        <div 
          id="ai-assistant-drawer"
          className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[580px] bg-white rounded-2xl border border-neutral-200 shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-6 duration-300"
        >
          {/* Header */}
          <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Sparkles className="h-4 w-4 text-yellow-200" />
              </div>
              <div>
                <h4 className="font-bold text-xs tracking-wide">AI Asset Assistant</h4>
                <p className="text-[10px] text-neutral-400">Agentic Registration & Multimodal</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Message Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 scrollbar-thin">
            {messages.map((m) => (
              <div 
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Image preview in bubble */}
                {m.imagePreview && (
                  <div className="max-w-[80%] rounded-xl overflow-hidden border border-neutral-200 shadow-sm mb-1 bg-white">
                    <img 
                      src={m.imagePreview} 
                      alt="Device preview" 
                      className="max-h-36 w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                
                {/* Text Bubble */}
                <div 
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium shadow-sm leading-relaxed ${
                    m.role === "user" 
                      ? "bg-indigo-600 text-white rounded-br-none" 
                      : "bg-white text-neutral-800 border border-neutral-200 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
                
                <span className="text-[9px] text-neutral-400 mt-1 px-1 font-mono">
                  {m.timestamp}
                </span>
              </div>
            ))}

            {/* Analyzing Device Loading State */}
            {analyzingImage && (
              <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium bg-neutral-100 p-3 rounded-xl border border-neutral-200 w-fit">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>AI is extracting specifications and price...</span>
              </div>
            )}

            {isSending && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium pl-1">
                <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce"></span>
                <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}

            {/* AI Active Draft Registration Card */}
            {activeDraft && (
              <div className="bg-white rounded-xl border border-indigo-200 shadow-md p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                  <div className="p-1 bg-indigo-50 rounded text-indigo-600">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-neutral-800">Drafted AI Specs</h5>
                    <p className="text-[10px] text-neutral-400">Captured via Gemini Intelligence</p>
                  </div>
                </div>

                {registerErrorMsg && (
                  <div className="p-2 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] rounded flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{registerErrorMsg}</span>
                  </div>
                )}

                <div className="space-y-2.5 text-[11px] font-semibold text-neutral-600">
                  {/* Name */}
                  <div>
                    <label className="text-[10px] text-neutral-400 font-medium block">Device Name</label>
                    <input 
                      type="text"
                      className="w-full p-1.5 border border-neutral-200 rounded mt-0.5 text-neutral-800 focus:outline-indigo-500 font-medium text-xs"
                      value={activeDraft.name}
                      onChange={e => setActiveDraft({ ...activeDraft, name: e.target.value })}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[10px] text-neutral-400 font-medium block">Device Category</label>
                    <input 
                      type="text"
                      className="w-full p-1.5 border border-neutral-200 rounded mt-0.5 text-neutral-800 focus:outline-indigo-500 font-medium text-xs"
                      value={activeDraft.categoryName}
                      onChange={e => setActiveDraft({ ...activeDraft, categoryName: e.target.value })}
                      placeholder="e.g. Laptop, Mobile, Furniture"
                    />
                  </div>

                  {/* Specs */}
                  <div>
                    <label className="text-[10px] text-neutral-400 font-medium block">Tech Specs / Description</label>
                    <textarea 
                      className="w-full p-1.5 border border-neutral-200 rounded mt-0.5 text-neutral-800 focus:outline-indigo-500 font-medium text-xs resize-none"
                      rows={2}
                      value={activeDraft.specs}
                      onChange={e => setActiveDraft({ ...activeDraft, specs: e.target.value })}
                    />
                  </div>

                  {/* Serial and Cost Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-medium block">Serial Number</label>
                      <input 
                        type="text"
                        className="w-full p-1.5 border border-neutral-200 rounded mt-0.5 text-neutral-800 focus:outline-indigo-500 font-medium text-xs"
                        value={activeDraft.serialNumber}
                        onChange={e => setActiveDraft({ ...activeDraft, serialNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-medium block">Estimated Cost (USD)</label>
                      <input 
                        type="number"
                        className="w-full p-1.5 border border-neutral-200 rounded mt-0.5 text-neutral-800 focus:outline-indigo-500 font-medium text-xs"
                        value={activeDraft.purchaseCost}
                        onChange={e => setActiveDraft({ ...activeDraft, purchaseCost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  {/* Required Date of Purchase */}
                  <div className="border-t border-indigo-50 pt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-indigo-600 font-bold block flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />
                        Purchase Date *
                      </label>
                      <input 
                        type="date"
                        required
                        className="w-full p-1.5 border border-indigo-200 rounded mt-0.5 text-neutral-800 focus:outline-indigo-500 text-xs bg-indigo-50/50"
                        value={draftPurchaseDate}
                        onChange={e => setDraftPurchaseDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-medium block">Floor Location</label>
                      <input 
                        type="text"
                        className="w-full p-1.5 border border-neutral-200 rounded mt-0.5 text-neutral-800 focus:outline-indigo-500 text-xs"
                        value={draftLocation}
                        onChange={e => setDraftLocation(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleConfirmRegistration}
                    disabled={isRegistering}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Confirm Registration</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setActiveDraft(null);
                      setImagePreviewUrl(null);
                    }}
                    className="px-2.5 py-2 bg-neutral-100 text-neutral-500 rounded text-xs hover:bg-neutral-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (Upload device photo) */}
          <div className="px-4 py-2 bg-neutral-100 border-t border-neutral-200 flex gap-2 items-center text-xs text-neutral-500 font-medium">
            <span className="shrink-0">Quick Action:</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 border border-neutral-200 hover:border-indigo-200 rounded-full transition shadow-sm cursor-pointer"
            >
              <Image className="h-3 w-3" />
              Upload Device Image
            </button>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Chat Form */}
          <form 
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-neutral-200 flex gap-2 items-center"
          >
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to add a device or ask a question..."
              className="flex-1 p-2 border border-neutral-200 rounded-xl text-xs font-medium focus:outline-indigo-600"
              disabled={isSending || analyzingImage}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending || analyzingImage}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
