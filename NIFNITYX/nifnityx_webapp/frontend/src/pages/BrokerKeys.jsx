import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Save, Wifi } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import api from "@/lib/api";
import { toast } from "sonner"; 

export default function BrokerKeys() {
  const [tradingMode, setTradingMode] = useState("paper");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const [keys, setKeys] = useState({
    clientCode: "",
    password: "",
    apiKey: "",
    secretKey: "",
    totpSecret: ""
  });

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.get("/broker/status");
        setTradingMode(data.tradingMode);
        // Pre-fill masked values if they exist
        if (data.maskedKey) {
            setKeys(prev => ({ 
                ...prev, 
                apiKey: data.maskedKey, 
                secretKey: "****************",
                password: "****************",
                totpSecret: "****************",
                clientCode: data.clientCode || ""
            }));
        }
      } catch (error) {
        console.error("Failed to fetch broker status");
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleModeChange = async (checked) => {
    const newMode = checked ? "live" : "paper";
    setTradingMode(newMode);
    toast(newMode === "live" ? "Switching to Live Trading..." : "Switching to Paper Trading...");

    try {
      await api.post("/broker/mode", { mode: newMode });
      toast.success(`Trading Mode set to ${newMode === "live" ? "Live" : "Paper"}`);
    } catch (error) {
      console.error("Failed to update mode");
      setTradingMode(checked ? "paper" : "live"); 
      toast.error("Failed to update trading mode");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ type: "", text: "" });

    try {
      await api.post("/broker/keys", {
        brokerName: "AngelOne", 
        ...keys
      });
      setStatusMsg({ type: "success", text: "Keys encrypted and saved successfully." });
      toast.success("Broker keys saved successfully");
    } catch (error) {
      setStatusMsg({ type: "error", text: error.response?.data?.message || "Failed to save keys." });
      toast.error(error.response?.data?.message || "Failed to save keys");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatusMsg({ type: "", text: "" });
    try {
      const { data } = await api.post("/broker/test", { brokerName: "AngelOne" });
      setStatusMsg({ type: "success", text: `${data.message} (Latency: ${data.latency})` });
      toast.success(`Connection successful! Hello ${data.data.name}`);
    } catch (error) {
      setStatusMsg({ type: "error", text: error.response?.data?.message || "Connection failed." });
      toast.error("Connection failed. Please check your credentials.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500 animate-pulse">Loading Broker Vault...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* 1. Global Trading Mode Switch */}
      <Card className="bg-zinc-900/30 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg text-white">Execution Mode</CardTitle>
            <CardDescription className="text-zinc-400">
              Toggle between Paper Trading (Simulated) and Live Trading (Real Money).
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
             <span className={`text-sm font-medium ${tradingMode === 'paper' ? 'text-green-400' : 'text-zinc-500'}`}>Paper</span>
             <Switch 
                checked={tradingMode === 'live'}
                onCheckedChange={handleModeChange}
                className="data-[state=checked]:bg-red-500/80 data-[state=unchecked]:bg-green-500/80"
             />
             <span className={`text-sm font-medium ${tradingMode === 'live' ? 'text-red-500' : 'text-zinc-500'}`}>Live</span>
          </div>
        </CardHeader>
      </Card>

      {/* 2. Broker Tabs */}
      <Tabs defaultValue="angel" className="w-full">
        <TabsList className="grid w-full grid-cols-1 bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="angel" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Angel One</TabsTrigger>
        </TabsList>
        
        <TabsContent value="angel">
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Angel One SmartAPI</CardTitle>
              <CardDescription className="text-zinc-400">
                Enter your credentials to enable live data fetching and order execution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client Code */}
                    <div className="space-y-2">
                    <Label className="text-zinc-300">Client Code (User ID)</Label>
                    <Input 
                        placeholder="Ex: A123456" 
                        value={keys.clientCode}
                        onChange={(e) => setKeys({...keys, clientCode: e.target.value})}
                        className="bg-black/50 border-zinc-800 text-white focus:ring-zinc-700"
                    />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                    <Label className="text-zinc-300">Login PIN/Password</Label>
                    <Input 
                        placeholder="Ex: 1234" 
                        value={keys.password}
                        onChange={(e) => setKeys({...keys, password: e.target.value})}
                        className="bg-black/50 border-zinc-800 text-white focus:ring-zinc-700"
                        type={showSecrets ? "text" : "password"}
                    />
                    </div>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">API Key</Label>
                  <Input 
                    placeholder="Ex: P1234567" 
                    value={keys.apiKey}
                    onChange={(e) => setKeys({...keys, apiKey: e.target.value})}
                    className="bg-black/50 border-zinc-800 text-white focus:ring-zinc-700"
                    type={showSecrets ? "text" : "password"}
                  />
                </div>

                {/* Secret Key & Toggle */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                     <Label className="text-zinc-300">Secret Key</Label>
                     <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                        {showSecrets ? <EyeOff size={12}/> : <Eye size={12}/>} {showSecrets ? "Hide" : "Show"} Secrets
                     </button>
                  </div>
                  <Input 
                    placeholder="Ex: your_secret_key_here" 
                    value={keys.secretKey}
                    onChange={(e) => setKeys({...keys, secretKey: e.target.value})}
                    className="bg-black/50 border-zinc-800 text-white focus:ring-zinc-700"
                    type={showSecrets ? "text" : "password"}
                  />
                </div>

                {/* TOTP */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">TOTP Secret</Label>
                  <Input 
                    placeholder="Enter TOTP Secret for automated 2FA" 
                    value={keys.totpSecret}
                    onChange={(e) => setKeys({...keys, totpSecret: e.target.value})}
                    className="bg-black/50 border-zinc-800 text-white focus:ring-zinc-700 font-mono text-sm"
                    type={showSecrets ? "text" : "password"}
                  />
                </div>

                {/* Status Messages */}
                {statusMsg.text && (
                   <Alert variant={statusMsg.type === 'error' ? "destructive" : "default"} className={`${statusMsg.type === 'success' ? 'bg-green-900/20 border-green-900 text-green-300' : 'bg-red-900/20 border-red-900 text-red-300'}`}>
                      {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4"/>}
                      <AlertTitle>{statusMsg.type === 'success' ? "Success" : "Error"}</AlertTitle>
                      <AlertDescription>{statusMsg.text}</AlertDescription>
                   </Alert>
                )}

                <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-zinc-200">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Save Keys
                    </Button>
                    <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                        {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wifi className="mr-2 h-4 w-4"/>}
                        Test Connection
                    </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="bg-black/20 border-t border-zinc-800 p-4">
               <p className="text-xs text-zinc-500">
                  Your keys are encrypted using AES-256. Connection test verifies login with Angel One API.
               </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}