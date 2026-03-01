# Zafron CLI

A command-line interface for the [Zafron](https://zafron.dev) IoT platform. Manage devices, view measurements, and configure data sources from your terminal.

## Installation

### Option 1: Pre-built Binaries (Recommended)

Download the latest binary for your operating system from the [Releases](https://github.com/zafroniot/zafron-cli/releases) page:

**macOS:**
```bash
# Intel Macs
curl -L https://github.com/zafroniot/zafron-cli/releases/latest/download/zafron-macos-x64 -o zafron
chmod +x zafron
sudo mv zafron /usr/local/bin/

# Apple Silicon (M1/M2/M3)
curl -L https://github.com/zafroniot/zafron-cli/releases/latest/download/zafron-macos-arm64 -o zafron
chmod +x zafron
sudo mv zafron /usr/local/bin/
```

**Linux:**
```bash
# x64
curl -L https://github.com/zafroniot/zafron-cli/releases/latest/download/zafron-linux-x64 -o zafron
chmod +x zafron
sudo mv zafron /usr/local/bin/

# ARM64 (Raspberry Pi, etc.)
curl -L https://github.com/zafroniot/zafron-cli/releases/latest/download/zafron-linux-arm64 -o zafron
chmod +x zafron
sudo mv zafron /usr/local/bin/
```

**Windows:**
```powershell
# Download and add to PATH
# Or use winget/scoop (coming soon)
```
Download `zafron-win-x64.exe` from the releases page and add it to your PATH.

### Option 2: npm

```bash
npm install -g zafron
```

### Option 3: From Source

```bash
git clone https://github.com/zafroniot/zafron-cli.git
cd zafron-cli
npm install
npm run build
npm link
```

## Quick Start

```bash
# Authenticate with your Zafron account
zafron login

# List your devices
zafron devices list

# Get details for a specific device
zafron devices get <device-id>
```

## Commands

### Authentication

```bash
zafron login
```

Prompts for your email and password, then stores an auth token locally at `~/.zafron/config.json`.

### Devices

```bash
zafron devices list                # List all devices
zafron devices get <id>            # Get device details
zafron devices create              # Create a new device (interactive)
zafron devices update <id>         # Update a device
zafron devices delete <id>         # Delete a device
zafron devices measurements <id>   # View device measurements
```

#### Creating a device

You can pass flags or use interactive prompts:

```bash
zafron devices create --name "Sensor A" --serial "SN-001" --type "sensor"
```

#### Updating a device

```bash
zafron devices update <id> --name "New Name"
zafron devices update <id> --enabled false
```

#### Deleting a device

```bash
zafron devices delete <id>        # Prompts for confirmation
zafron devices delete <id> --yes  # Skip confirmation
```

#### Viewing measurements

```bash
zafron devices measurements <id>
zafron devices measurements <id> --channel temperature
zafron devices measurements <id> --type float --start 2026-01-01 --end 2026-02-01
zafron devices measurements <id> --limit 50 --page 2
```

| Flag | Description |
|------|-------------|
| `--channel <channels>` | Filter by channel (comma-separated) |
| `--type <types>` | Filter by measurement type (comma-separated) |
| `--start <date>` | Start date |
| `--end <date>` | End date |
| `--limit <n>` | Results per page (default: 25) |
| `--page <n>` | Page number (default: 1) |

### Sources

```bash
zafron sources list          # List all data sources
zafron sources get <id>      # Get source details
```

### Global Options

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON instead of formatted tables |
| `--version` | Show version number |
| `--help` | Show help |

## Configuration

The CLI stores its configuration at `~/.zafron/config.json`:

```json
{
  "token": "...",
  "apiUrl": "https://api.zafron.dev"
}
```

## Development

```bash
npm run build    # Compile TypeScript
npm run dev      # Watch mode
npm test         # Run tests
```

### Building Binaries

To create standalone executables for distribution:

```bash
# Build for all platforms
npm run build:all

# Or build for specific platforms
npm run build:macos    # macOS (Intel + Apple Silicon)
npm run build:linux    # Linux (x64 + ARM64)
npm run build:windows  # Windows (x64)
```

Binaries will be output to `dist/binaries/`:
- `zafron-macos-x64` - macOS Intel
- `zafron-macos-arm64` - macOS Apple Silicon
- `zafron-linux-x64` - Linux x64
- `zafron-linux-arm64` - Linux ARM64
- `zafron-win-x64.exe` - Windows x64

### Project Structure

```
src/
├── index.ts              # Entry point
├── commands/
│   ├── login.ts          # Authentication
│   ├── devices/          # Device CRUD + measurements
│   └── sources/          # Source management
├── lib/
│   ├── api-client.ts     # HTTP client
│   ├── config.ts         # Config management
│   └── output.ts         # Output formatting
└── types/
    ├── device.ts         # Device & measurement types
    └── source.ts         # Source types
```

Built with TypeScript, [Commander.js](https://github.com/tj/commander.js), [Chalk](https://github.com/chalk/chalk), and [cli-table3](https://github.com/cli-table/cli-table3).

## License

MIT
