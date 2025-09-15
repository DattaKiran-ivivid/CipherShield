import React, { useState } from 'react';
import { Search, Filter, Download, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';

const logEntries = [
  {
    id: 1,
    timestamp: '2024-01-15 14:32:18',
    level: 'INFO',
    operation: 'FILE_PROCESSED',
    user: 'admin@company.com',
    filename: 'customer_database.csv',
    piiFound: 156,
    status: 'SUCCESS',
    duration: '2.3s',
    details: 'Successfully processed file with 156 PII elements detected and anonymized'
  },
  {
    id: 2,
    timestamp: '2024-01-15 14:28:45',
    level: 'WARNING',
    operation: 'HIGH_PII_VOLUME',
    user: 'admin@company.com',
    filename: 'employee_records.xlsx',
    piiFound: 1247,
    status: 'SUCCESS',
    duration: '8.7s',
    details: 'High volume of PII detected (1247 elements) - manual review recommended'
  },
  {
    id: 3,
    timestamp: '2024-01-15 14:15:22',
    level: 'ERROR',
    operation: 'PROCESSING_FAILED',
    user: 'admin@company.com',
    filename: 'corrupted_file.pdf',
    piiFound: 0,
    status: 'FAILED',
    duration: '0.5s',
    details: 'File processing failed: Unsupported file format or corrupted data'
  },
  {
    id: 4,
    timestamp: '2024-01-15 13:45:12',
    level: 'INFO',
    operation: 'LOGIN',
    user: 'admin@company.com',
    filename: '-',
    piiFound: 0,
    status: 'SUCCESS',
    duration: '-',
    details: 'User logged in successfully from IP 192.168.1.100'
  },
  {
    id: 5,
    timestamp: '2024-01-15 13:22:08',
    level: 'INFO',
    operation: 'SETTINGS_UPDATED',
    user: 'admin@company.com',
    filename: '-',
    piiFound: 0,
    status: 'SUCCESS',
    duration: '-',
    details: 'PII detection rules updated - Email anonymization rule modified'
  },
  {
    id: 6,
    timestamp: '2024-01-15 12:58:33',
    level: 'INFO',
    operation: 'EXPORT_GENERATED',
    user: 'admin@company.com',
    filename: 'processed_data.csv',
    piiFound: 89,
    status: 'SUCCESS',
    duration: '1.2s',
    details: 'Anonymized data exported successfully'
  },
  {
    id: 7,
    timestamp: '2024-01-15 12:35:17',
    level: 'WARNING',
    operation: 'FAILED_LOGIN',
    user: 'unknown@domain.com',
    filename: '-',
    piiFound: 0,
    status: 'FAILED',
    duration: '-',
    details: 'Failed login attempt from IP 203.0.113.45 - invalid credentials'
  },
  {
    id: 8,
    timestamp: '2024-01-15 11:42:55',
    level: 'INFO',
    operation: 'TEXT_PROCESSED',
    user: 'admin@company.com',
    filename: 'direct_input',
    piiFound: 12,
    status: 'SUCCESS',
    duration: '0.8s',
    details: 'Direct text input processed - 12 PII elements anonymized'
  }
];

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'ERROR':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'WARNING':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'INFO':
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
};

const getLevelBadge = (level: string) => {
  const variant = level === 'ERROR' ? 'destructive' : 
                  level === 'WARNING' ? 'secondary' : 'default';
  return <Badge variant={variant}>{level}</Badge>;
};

const getStatusBadge = (status: string) => {
  const variant = status === 'SUCCESS' ? 'default' : 'destructive';
  return <Badge variant={variant}>{status}</Badge>;
};

interface LogsScreenProps {
  onBack: () => void;
}

export function LogsScreen({ onBack }: LogsScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedOperation, setSelectedOperation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);

  const filteredLogs = logEntries.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    const matchesOperation = selectedOperation === 'all' || log.operation === selectedOperation;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;

    return matchesSearch && matchesLevel && matchesOperation && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLogs(filteredLogs.map(log => log.id));
    } else {
      setSelectedLogs([]);
    }
  };

  const handleSelectLog = (logId: number, checked: boolean) => {
    if (checked) {
      setSelectedLogs([...selectedLogs, logId]);
    } else {
      setSelectedLogs(selectedLogs.filter(id => id !== logId));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Activity Logs</h1>
          <p className="text-muted-foreground">
            Monitor system activities, processing operations, and security events
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logEntries.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Operations</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logEntries.filter(log => log.status === 'SUCCESS').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((logEntries.filter(log => log.status === 'SUCCESS').length / logEntries.length) * 100)}% success rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logEntries.filter(log => log.level === 'ERROR').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PII Processed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logEntries.reduce((sum, log) => sum + log.piiFound, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Elements detected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filter & Search</CardTitle>
              <CardDescription>Find specific log entries using filters and search</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs by filename, user, or details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Level</label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="WARNING">Warning</SelectItem>
                      <SelectItem value="ERROR">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Operation</label>
                  <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Operations</SelectItem>
                      <SelectItem value="FILE_PROCESSED">File Processed</SelectItem>
                      <SelectItem value="TEXT_PROCESSED">Text Processed</SelectItem>
                      <SelectItem value="LOGIN">Login</SelectItem>
                      <SelectItem value="EXPORT_GENERATED">Export Generated</SelectItem>
                      <SelectItem value="SETTINGS_UPDATED">Settings Updated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="SUCCESS">Success</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="mr-2 h-4 w-4" />
                        Today
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Log Entries</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} of {logEntries.length} log entries
              </CardDescription>
            </div>
            {selectedLogs.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedLogs.length} selected</Badge>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredLogs.length > 0 && selectedLogs.length === filteredLogs.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>User</TableHead>
                <TableHead>File/Source</TableHead>
                <TableHead>PII Found</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedLogs.includes(log.id)}
                      onCheckedChange={(checked) => handleSelectLog(log.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      {getLevelBadge(log.level)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {log.operation.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.user}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.filename !== '-' ? log.filename : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {log.piiFound > 0 ? (
                      <Badge variant={log.piiFound > 100 ? 'destructive' : 'secondary'}>
                        {log.piiFound}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.duration !== '-' ? log.duration : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="max-w-md truncate" title={log.details}>
                    {log.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Log retention: 90 days | Auto-refresh: Every 30 seconds
            </div>
            <div>
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}