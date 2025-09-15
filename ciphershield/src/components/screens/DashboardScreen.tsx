import React, { useState } from 'react';
import { Upload, FileText, Settings, BarChart3, Shield, Plus, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const [textInput, setTextInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).map(file => file.path);
    if (files.length > 0) {
      const result = await invoke('process_files', {
        input: {
          files,
          action: 'anonymize',
          template_id: null,
        }
      });
      console.log(result);
      onNavigate('process');
    }
  };

  const handleBrowse = async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'Data Files', extensions: ['pdf', 'csv', 'json', 'xml', 'txt'] }],
    });
    if (Array.isArray(selected) && selected.length > 0) {
      const result = await invoke('process_files', {
        input: {
          files: selected,
          action: 'anonymize',
          template_id: null,
        }
      });
      console.log(result);
      onNavigate('process');
    }
  };

  const handleTextProcess = async () => {
    if (textInput.trim()) {
      const result = await invoke('process_text', {
        input: {
          text: textInput,
          action: 'anonymize',
          save_template: !!templateName,
          template_name: templateName || undefined,
        }
      });
      console.log(result);
      setTextInput('');
      setTemplateName('');
      onNavigate('process');
    }
  };

  const recentProcesses = [
    { id: 1, name: 'Customer_Database.csv', status: 'completed', piiFound: 156, time: '2 min ago' },
    { id: 2, name: 'Employee_Records.xlsx', status: 'processing', piiFound: 89, time: '5 min ago' },
    { id: 3, name: 'Marketing_Leads.json', status: 'completed', piiFound: 203, time: '1 hour ago' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PII Elements Detected</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,231</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.8%</div>
            <p className="text-xs text-muted-foreground">+0.2% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3s</div>
            <p className="text-xs text-muted-foreground">-0.5s from last month</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Files for Processing</CardTitle>
              <CardDescription>Drag and drop multiple files or click to browse. Supports PDF, CSV, JSON, XML, TXT formats.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Drop files here</p>
                  <p className="text-sm text-muted-foreground">or click to browse your computer</p>
                  <Button className="mt-4" onClick={handleBrowse}>Select Files</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Direct Text Processing</CardTitle>
              <CardDescription>Paste or type text directly for immediate PII detection and anonymization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="text-input">Input Text</Label>
                <Textarea
                  id="text-input"
                  placeholder="Paste your text here... For example: 'John Smith (john.smith@email.com) called from 555-123-4567 regarding his SSN 123-45-6789.'"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="template-name">Template Name (Optional)</Label>
                <Input
                  id="template-name"
                  placeholder="Enter template name to save mappings"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleTextProcess}
                  disabled={!textInput.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  Process Text
                </Button>
                <Button variant="outline" onClick={() => { setTextInput(''); setTemplateName(''); }}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Processing Jobs</CardTitle>
              <CardDescription>View and manage your recent PII processing tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProcesses.map((process) => (
                  <div key={process.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{process.name}</p>
                        <p className="text-sm text-muted-foreground">{process.piiFound} PII elements found • {process.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={process.status === 'completed' ? 'default' : 'secondary'}>{process.status}</Badge>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Options</CardTitle>
              <CardDescription>Configure how your data is processed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Detection Level</Label>
                <Select defaultValue="high">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Sensitivity</SelectItem>
                    <SelectItem value="medium">Medium Sensitivity</SelectItem>
                    <SelectItem value="high">High Sensitivity</SelectItem>
                    <SelectItem value="strict">Strict Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Output Format</Label>
                <Select defaultValue="anonymized">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anonymized">Anonymized</SelectItem>
                    <SelectItem value="redacted">Redacted</SelectItem>
                    <SelectItem value="encrypted">Encrypted</SelectItem>
                    <SelectItem value="tokenized">Tokenized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="preserve-format">Preserve Formatting</Label>
                  <Switch id="preserve-format" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="generate-report">Generate Report</Label>
                  <Switch id="generate-report" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="backup-original">Backup Original</Label>
                  <Switch id="backup-original" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configure PII Rules
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('logs')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Processing Logs
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing Queue</span>
                  <span>2 jobs</span>
                </div>
                <Progress value={33} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage Used</span>
                  <span>68%</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground">Last updated: Just now</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}