import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Download, Play, Pause, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { invoke } from '@tauri-apps/api/core';

const steps = [
  { id: 1, name: 'Upload', completed: true },
  { id: 2, name: 'Analyze', completed: true },
  { id: 3, name: 'Process', completed: false, active: true },
  { id: 4, name: 'Review', completed: false },
  { id: 5, name: 'Export', completed: false },
];

interface ProcessingScreenProps {
  onBack: () => void;
}

interface PIIItem {
  id: number;
  type: string;
  original: string;
  anonymized: string;
  confidence: number;
  action: string;
}

interface Template {
  id: number;
  name: string;
  mappings: PIIItem[];
}

export function ProcessingScreen({ onBack }: ProcessingScreenProps) {
  const [processing, setProcessing] = useState(true);
  const [progress, setProgress] = useState(65);
  const [showOriginal, setShowOriginal] = useState(true);
  const [piiData, setPiiData] = useState<PIIItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState('');
  const [processedText, setProcessedText] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      const templates = await invoke('get_templates');
      setTemplates(templates);
    };
    fetchTemplates();
  }, []);

  const handleActionChange = (id: number, newAction: string) => {
    setPiiData(piiData.map(item => item.id === id ? { ...item, action: newAction } : item));
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Processing Pipeline</CardTitle>
          <CardDescription>Track the progress of your PII anonymization workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 
                    ${step.completed ? 'bg-primary border-primary text-primary-foreground' : 
                       step.active ? 'border-primary text-primary bg-primary/10' : 
                       'border-muted-foreground text-muted-foreground'}
                  `}>
                    {step.completed ? <Check className="w-5 h-5" /> : <span>{step.id}</span>}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${step.completed || step.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.name}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground mx-4" />
                )}
              </div>
            ))}
          </div>
          {processing && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Original Content</CardTitle>
                <CardDescription>Source data with detected PII highlighted</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowOriginal(!showOriginal)}>
                {showOriginal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showOriginal ? (
              <Textarea value={originalText} readOnly rows={8} className="font-mono text-sm" />
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Original content hidden for security
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Processed Preview</CardTitle>
            <CardDescription>Anonymized output with PII protection applied</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={processedText} readOnly rows={8} className="font-mono text-sm" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detected PII Elements</CardTitle>
              <CardDescription>{piiData.length} PII elements found and processed</CardDescription>
            </div>
            <Badge variant="secondary">{piiData.length} items</Badge>
          </div>
          <div className="mt-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id.toString()}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Original Value</TableHead>
                <TableHead>Processed Value</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Override</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {piiData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{showOriginal ? item.original : '••••••••'}</TableCell>
                  <TableCell className="font-mono text-sm">{item.anonymized}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${item.confidence}%` }} />
                      </div>
                      <span className="text-sm">{item.confidence}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.action === 'Redact' ? 'destructive' : item.action === 'Anonymize' ? 'default' : 'secondary'}>
                      {item.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={item.action.toLowerCase()} onValueChange={(value) => handleActionChange(item.id, value)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anonymize">Anonymize</SelectItem>
                        <SelectItem value="redact">Redact</SelectItem>
                        <SelectItem value="tokenize">Tokenize</SelectItem>
                        <SelectItem value="ignore">Ignore</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack}>Back to Dashboard</Button>
              <Button variant="outline"><RotateCcw className="mr-2 h-4 w-4" />Reset Processing</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Save as Template</Button>
              {processing ? (
                <Button variant="outline"><Pause className="mr-2 h-4 w-4" />Pause</Button>
              ) : (
                <Button><Play className="mr-2 h-4 w-4" />Continue Processing</Button>
              )}
              <Button className="bg-accent hover:bg-accent/90"><Download className="mr-2 h-4 w-4" />Export Results</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}