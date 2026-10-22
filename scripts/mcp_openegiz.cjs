#!/usr/bin/env node
/**
 * OpenEgiz Mining Digital Twin MCP Server
 * Model Context Protocol (MCP) stdio server for Smart-Kenish 4.0
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const TOOLS = [
  {
    name: "get_mine_overview",
    description: "Returns high-level architectural and operational overview of the Smart-Kenish 4.0 OpenEgiz open-pit copper mine, including active systems, digital twins, and primary KPIs.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_fleet_telemetry",
    description: "Returns telemetry and status for the autonomous haulage fleet (BelAZ-75710, BelAZ-75131), including coordinates, speed, payload, battery/fuel, and 1200V DC trolley assist line engagement.",
    inputSchema: {
      type: "object",
      properties: {
        truck_id: {
          type: "string",
          description: "Optional specific truck ID (e.g. 'BELAZ-75710-01', 'BELAZ-75131-02')"
        }
      },
      required: []
    }
  },
  {
    name: "get_geotech_dem_status",
    description: "Returns geotechnical slope stability metrics, bench elevations (-120m to +40m), Factor of Safety (FoS), and radar displacement monitoring data.",
    inputSchema: {
      type: "object",
      properties: {
        sector: {
          type: "string",
          description: "Pit sector ('North-West', 'South-East', 'Crusher-Approach', 'All')"
        }
      },
      required: []
    }
  },
  {
    name: "query_ditto_twins",
    description: "Inspects digital twin definitions and feature properties from Eclipse Ditto repository.",
    inputSchema: {
      type: "object",
      properties: {
        device_type: {
          type: "string",
          description: "Device type ('truck', 'shovel', 'crusher', 'substation', 'sensor')"
        }
      },
      required: []
    }
  }
];

function handleToolCall(name, args) {
  if (name === 'get_mine_overview') {
    return {
      status: "OPERATIONAL",
      mine: "Aktau-Mys Copper Open-Pit Complex (Smart-Kenish 4.0)",
      target_kpis: {
        ore_grade_blend: "0.850% Cu (Target: 0.850 ± 0.015%)",
        trolley_speed: "24.5 km/h on +8% ramp (vs 11.2 km/h diesel)",
        crusher_throughput: "2400 t/h (KKD-1500 gyratory crusher)",
        geotech_fos: 1.34,
        npv_gain: "+$18.42M",
        prevented_incident_damage: "$9,522,000"
      },
      digital_twins_count: 24,
      haulage_system: "1200V DC Overhead Catenary + Autonomous BelAZ",
      stack: "Eclipse Ditto (twins), MQTT (telemetry), HTML5 2.5D SCADA, Node.js Fleet API"
    };
  }

  if (name === 'get_fleet_telemetry') {
    const trucks = [
      { id: "BELAZ-75710-01", model: "75710 (450t)", status: "HAULING_RAMP", speed_kmh: 24.5, payload_t: 448, trolley_engaged: true, trolley_voltage_v: 1215, x: 520, y: 310, z: -45 },
      { id: "BELAZ-75710-02", model: "75710 (450t)", status: "LOADING_SHOVEL_3", speed_kmh: 0.0, payload_t: 380, trolley_engaged: false, trolley_voltage_v: 0, x: 280, y: 460, z: -105 },
      { id: "BELAZ-75131-01", model: "75131 (130t)", status: "DISCHARGING_CRUSHER", speed_kmh: 4.2, payload_t: 128, trolley_engaged: false, trolley_voltage_v: 0, x: 810, y: 190, z: 25 },
      { id: "BELAZ-75131-02", model: "75131 (130t)", status: "EMPTY_RETURN", speed_kmh: 32.0, payload_t: 0, trolley_engaged: false, trolley_voltage_v: 0, x: 440, y: 220, z: -15 }
    ];
    if (args && args.truck_id) {
      const match = trucks.find(t => t.id.toLowerCase() === args.truck_id.toLowerCase());
      return match || { error: `Truck ${args.truck_id} not found`, available: trucks.map(t => t.id) };
    }
    return { fleet_count: trucks.length, trucks };
  }

  if (name === 'get_geotech_dem_status') {
    return {
      dem_model: "Aktau-Mys 5m-resolution LiDAR DEM",
      bench_count: 8,
      elevation_range_m: { min: -120, max: 40 },
      factor_of_safety_fos: 1.34,
      critical_threshold: 1.20,
      active_radars: 4,
      max_displacement_rate_mm_day: 1.8,
      status: "NORMAL_STABILITY"
    };
  }

  if (name === 'query_ditto_twins') {
    const dittoFile = path.join(PROJECT_ROOT, 'team-018-main', 'team', 'ditto', 'ditto_twins_init.json');
    if (fs.existsSync(dittoFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(dittoFile, 'utf8'));
        return { source: "ditto_twins_init.json", things: Array.isArray(data) ? data.slice(0, 10) : data };
      } catch (e) {
        return { error: e.message };
      }
    }
    return {
      twins: [
        { thingId: "org.openegiz:belaz-75710-01", type: "autonomous-dump-truck", state: "online" },
        { thingId: "org.openegiz:kkd-1500-crusher", type: "gyratory-crusher", state: "crushing" },
        { thingId: "org.openegiz:trolley-substation-1", type: "power-substation", state: "1200V_ACTIVE" }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

function processMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  const { id, method, params } = msg;

  if (method === 'initialize') {
    sendMessage({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "openegiz-mine-mcp",
          version: "1.0.0"
        }
      }
    });
    return;
  }

  if (method === 'notifications/initialized') {
    // Client acknowledgement notification; no response required
    return;
  }

  if (method === 'ping') {
    sendMessage({
      jsonrpc: "2.0",
      id,
      result: {}
    });
    return;
  }

  if (method === 'tools/list') {
    sendMessage({
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS
      }
    });
    return;
  }

  if (method === 'tools/call') {
    const { name, arguments: toolArgs } = params || {};
    try {
      const data = handleToolCall(name, toolArgs);
      sendMessage({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        }
      });
    } catch (err) {
      sendMessage({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: err.message
        }
      });
    }
    return;
  }

  // Fallback for unhandled methods
  if (id !== undefined) {
    sendMessage({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    });
  }
}

function sendMessage(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const msg = JSON.parse(trimmed);
    processMessage(msg);
  } catch (err) {
    // Malformed JSON ignored
  }
});

process.stderr.write("OpenEgiz MCP Server started successfully on stdio\n");
