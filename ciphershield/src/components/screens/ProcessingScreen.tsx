import React, { useState } from 'react';
import { Check, ChevronRight, Download, Play, Pause, RotateCcw, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { invoke } from '@tauri-apps/api/core';

const steps = [
  { id: 1, name: 'Input', completed: true },
  { id: 2, name: 'Analyze', completed: false, active: true },
  { id: 3, name: 'Preview', completed: false },
  { id: 4, name: 'Save/Export', completed: false },
];

interface PIIItem {
  id: number;
  type: string;
  original: string;
  anonymized: string;
  confidence: number;
  action: string;
}

interface CustomRecognizer {
  entity_type: string;
  pattern: string;
  confidence: number;
}

interface ProcessingScreenProps {
  onBack: () => void;
}

export function ProcessingScreen({ onBack }: ProcessingScreenProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOriginal, setShowOriginal] = useState(true);
  const [piiData, setPiiData] = useState<PIIItem[]>([]);
  const [textInput, setTextInput] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [custom_recognizers, setCustomRecognizers] = useState<CustomRecognizer[]>([]);
  const [newEntityType, setNewEntityType] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newConfidence, setNewConfidence] = useState(0.8);
  const [error, setError] = useState<string | null>(null);

  const addCustomRecognizer = () => {
    if (newEntityType && newPattern) {
      setCustomRecognizers([...custom_recognizers, { entity_type: newEntityType, pattern: newPattern, confidence: newConfidence }]);
      setNewEntityType('');
      setNewPattern('');
      setNewConfidence(0.8);
    }
  };

  const removeCustomRecognizer = (index: number) => {
    setCustomRecognizers(custom_recognizers.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    setProcessing(true);
    setProgress(20);
    setError(null);
    try {
      const result = await invoke('process_text', {
        input: {
          text: textInput,
          action: 'anonymize',
          save_template: false,
          template_name: null,
          custom_recognizers,
        }
      });
      setOriginalText(textInput);
      setProcessedText(result.result);
      setPiiData(result.items.map((item: any, idx: number) => ({
        id: idx + 1,
        type: item.pii_type,
        original: item.original,
        anonymized: item.anonymized,
        confidence: item.confidence * 100,
        action: 'Anonymize',
      })));
      setProgress(100);
    } catch (e) {
      setError(`Processing failed: ${e}`);
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (templateName) {
      setError(null);
      try {
        await invoke('process_text', {
          input: {
            text: textInput,
            action: 'anonymize',
            save_template: true,
            template_name: templateName,
            custom_recognizers,
          }
        });
        setTemplateName('');
      } catch (e) {
        setError(`Failed to save template: ${e}`);
        console.error(e);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Steps Wizard */}
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
                    ${step.completed 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : step.active 
                        ? 'border-primary text-primary bg-primary/10' 
                        : 'border-muted-foreground text-muted-foreground'
                    }
                  `}>
                    {step.completed ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      step.completed || step.active ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
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
          {error && (
            <div className="mt-4 text-red-500 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Entities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity Type</TableHead>
                <TableHead>Regex Pattern</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custom_recognizers.map((cr, idx) => (
                <TableRow key={idx}>
                  <TableCell>{cr.entity_type}</TableCell>
                  <TableCell>{cr.pattern}</TableCell>
                  <TableCell>{cr.confidence}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => removeCustomRecognizer(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <Input 
                    value={newEntityType} 
                    onChange={(e) => setNewEntityType(e.target.value)} 
                    placeholder="Type" 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={newPattern} 
                    onChange={(e) => setNewPattern(e.target.value)} 
                    placeholder="Regex" 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    value={newConfidence} 
                    onChange={(e) => setNewConfidence(parseFloat(e.target.value))} 
                    min={0} 
                    max={1} 
                    step={0.1} 
                  />
                </TableCell>
                <TableCell>
                  <Button onClick={addCustomRecognizer}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Input Text</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            value={textInput} 
            onChange={(e) => setTextInput(e.target.value)} 
            rows={8} 
            className="font-mono text-sm"
          />
          <Button onClick={handleProcess} disabled={processing} className="mt-4">
            Process
          </Button>
        </CardContent>
      </Card>

      {/* Split View - Original vs Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Original Content</CardTitle>
                <CardDescription>Source data with detected PII highlighted</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOriginal(!showOriginal)}
              >
                {showOriginal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showOriginal ? (
              <Textarea
                value={originalText}
                readOnly
                rows={8}
                className="font-mono text-sm"
              />
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
            <Textarea
              value={processedText}
              readOnly
              rows={8}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>

      {/* PII Detection Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detected PII Elements</CardTitle>
              <CardDescription>
                {piiData.length} PII elements found and processed
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {piiData.length} items
            </Badge>
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
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {showOriginal ? item.original : '••••••••'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.anonymized}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${item.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm">{item.confidence}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      item.action === 'Redact' ? 'destructive' : 
                      item.action === 'Anonymize' ? 'default' : 'secondary'
                    }>
                      {item.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select 
                      defaultValue={item.action.toLowerCase()} 
                      onValueChange={(value) => {
                        setPiiData(piiData.map(i => 
                          i.id === item.id ? { ...i, action: value.charAt(0).toUpperCase() + value.slice(1) } : i
                        ));
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
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

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack}>
                Back to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setTextInput('');
                  setOriginalText('');
                  setProcessedText('');
                  setPiiData([]);
                  setProgress(0);
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Processing
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)} 
                placeholder="Template Name" 
                className="w-48"
              />
              <Button variant="outline" onClick={handleSaveTemplate} disabled={!templateName}>
                Save as Template
              </Button>
              {processing ? (
                <Button variant="outline" disabled>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              ) : (
                <Button onClick={handleProcess} disabled={!textInput}>
                  <Play className="mr-2 h-4 w-4" />
                  Continue Processing
                </Button>
              )}
              <Button 
                className="bg-accent hover:bg-accent/90" 
                disabled={!processedText}
                onClick={() => {
                  // Implement export logic here
                  console.log('Exporting results:', processedText);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Results
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}