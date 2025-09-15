import React, { useState } from 'react';
import { Shield, User, Lock, Bell, Database, Key, Globe, Trash2, Plus, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Separator } from '../ui/separator';

const piiRules = [
  { id: 1, name: 'Email Addresses', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', enabled: true, action: 'Anonymize' },
  { id: 2, name: 'Phone Numbers', pattern: '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b', enabled: true, action: 'Redact' },
  { id: 3, name: 'SSN', pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b', enabled: true, action: 'Redact' },
  { id: 4, name: 'Credit Cards', pattern: '\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b', enabled: true, action: 'Tokenize' },
  { id: 5, name: 'Names (First Last)', pattern: '\\b[A-Z][a-z]+ [A-Z][a-z]+\\b', enabled: false, action: 'Anonymize' },
];

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Settings</h1>
          <p className="text-muted-foreground">
            Configure CipherShield Pro to meet your organization's privacy requirements
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="pii-rules" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            PII Rules
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>
                  General settings for the CipherShield Pro interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                      <SelectItem value="cet">Central European Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Default Theme</Label>
                  <Select defaultValue="system">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-save">Auto-save drafts</Label>
                    <Switch id="auto-save" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-tooltips">Show tooltips</Label>
                    <Switch id="show-tooltips" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confirm-actions">Confirm destructive actions</Label>
                    <Switch id="confirm-actions" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Defaults</CardTitle>
                <CardDescription>
                  Default settings for PII processing operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="detection-level">Default Detection Level</Label>
                  <Select defaultValue="high">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Sensitivity</SelectItem>
                      <SelectItem value="medium">Medium Sensitivity</SelectItem>
                      <SelectItem value="high">High Sensitivity</SelectItem>
                      <SelectItem value="strict">Strict Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="output-format">Default Output Format</Label>
                  <Select defaultValue="anonymized">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anonymized">Anonymized</SelectItem>
                      <SelectItem value="redacted">Redacted</SelectItem>
                      <SelectItem value="encrypted">Encrypted</SelectItem>
                      <SelectItem value="tokenized">Tokenized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batch-size">Batch Processing Size</Label>
                  <Input id="batch-size" type="number" defaultValue="100" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="preserve-format">Preserve formatting</Label>
                    <Switch id="preserve-format" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="generate-report">Generate processing reports</Label>
                    <Switch id="generate-report" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="backup-original">Backup original files</Label>
                    <Switch id="backup-original" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure when and how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Processing Events</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-complete">Job completion</Label>
                      <Switch id="notify-complete" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-error">Processing errors</Label>
                      <Switch id="notify-error" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-high-pii">High PII volume detected</Label>
                      <Switch id="notify-high-pii" defaultChecked />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">System Events</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-updates">Software updates</Label>
                      <Switch id="notify-updates" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-maintenance">Scheduled maintenance</Label>
                      <Switch id="notify-maintenance" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify-security">Security alerts</Label>
                      <Switch id="notify-security" defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pii-rules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>PII Detection Rules</CardTitle>
                  <CardDescription>
                    Configure patterns and actions for different types of personally identifiable information
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {piiRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="font-mono text-sm max-w-xs truncate">{rule.pattern}</TableCell>
                      <TableCell>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          rule.action === 'Redact' ? 'destructive' : 
                          rule.action === 'Anonymize' ? 'default' : 'secondary'
                        }>
                          {rule.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rule Testing</CardTitle>
                <CardDescription>
                  Test your PII detection rules against sample text
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-text">Test Text</Label>
                  <Textarea
                    id="test-text"
                    placeholder="Enter sample text to test against your PII rules..."
                    rows={6}
                  />
                </div>
                <Button className="w-full">
                  Test Rules
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Global Rule Settings</CardTitle>
                <CardDescription>
                  Settings that apply to all PII detection rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confidence-threshold">Minimum Confidence Threshold</Label>
                  <Input id="confidence-threshold" type="number" defaultValue="85" />
                  <p className="text-xs text-muted-foreground">
                    Only matches above this confidence level will be processed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context-window">Context Window Size</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (±5 words)</SelectItem>
                      <SelectItem value="medium">Medium (±10 words)</SelectItem>
                      <SelectItem value="large">Large (±20 words)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="case-sensitive">Case sensitive matching</Label>
                    <Switch id="case-sensitive" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="partial-matches">Allow partial matches</Label>
                    <Switch id="partial-matches" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="overlapping">Process overlapping matches</Label>
                    <Switch id="overlapping" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Access Control</CardTitle>
                <CardDescription>
                  Manage user authentication and session settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input id="session-timeout" type="number" defaultValue="60" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-attempts">Max Login Attempts</Label>
                  <Input id="max-attempts" type="number" defaultValue="3" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-policy">Password Policy</Label>
                  <Select defaultValue="strong">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                      <SelectItem value="standard">Standard (8+ chars, mixed case)</SelectItem>
                      <SelectItem value="strong">Strong (12+ chars, symbols)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (16+ chars, complex)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-mfa">Require multi-factor authentication</Label>
                    <Switch id="require-mfa" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="remember-device">Allow device remembering</Label>
                    <Switch id="remember-device" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="audit-login">Audit login attempts</Label>
                    <Switch id="audit-login" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Protection</CardTitle>
                <CardDescription>
                  Configure encryption and data handling settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="encryption-level">Encryption Level</Label>
                  <Select defaultValue="aes256">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aes128">AES-128</SelectItem>
                      <SelectItem value="aes256">AES-256</SelectItem>
                      <SelectItem value="rsa2048">RSA-2048</SelectItem>
                      <SelectItem value="rsa4096">RSA-4096</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key-rotation">Key Rotation Interval</Label>
                  <Select defaultValue="monthly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data-retention">Data Retention Period (days)</Label>
                  <Input id="data-retention" type="number" defaultValue="365" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="encrypt-at-rest">Encrypt data at rest</Label>
                    <Switch id="encrypt-at-rest" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="encrypt-in-transit">Encrypt data in transit</Label>
                    <Switch id="encrypt-in-transit" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="secure-delete">Secure file deletion</Label>
                    <Switch id="secure-delete" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compliance & Auditing</CardTitle>
              <CardDescription>
                Configure compliance settings and audit trails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Compliance Frameworks</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="gdpr">GDPR Compliance</Label>
                      <Switch id="gdpr" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ccpa">CCPA Compliance</Label>
                      <Switch id="ccpa" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hipaa">HIPAA Compliance</Label>
                      <Switch id="hipaa" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sox">SOX Compliance</Label>
                      <Switch id="sox" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Audit Settings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="log-all">Log all operations</Label>
                      <Switch id="log-all" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="log-access">Log data access</Label>
                      <Switch id="log-access" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="log-changes">Log configuration changes</Label>
                      <Switch id="log-changes" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="log-exports">Log data exports</Label>
                      <Switch id="log-exports" defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Reporting</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Database className="mr-2 h-4 w-4" />
                      Generate Audit Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Key className="mr-2 h-4 w-4" />
                      Export Encryption Keys
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Globe className="mr-2 h-4 w-4" />
                      Compliance Dashboard
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline">
              Reset to Defaults
            </Button>
            <Button>
              Save Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}