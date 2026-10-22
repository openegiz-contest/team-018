# Data Sources, References & Licensing Manifest (Дереккөздер мен лицензиялар)
## Team-018: Smart-Kenish 4.0 Digital Mine Platform
### OpenEgiz Competition Compliance (Rules 6.8–6.11)

---

## 1. Overview & Licensing Policy
In accordance with the OpenEgiz Competition Rules (Clauses 6.8–6.11) and the official guidelines at [https://openegiz-contest.github.io/ru/data/](https://openegiz-contest.github.io/ru/data/), all external datasets utilized by Smart-Kenish 4.0 are:
1. **Completely license-clean**, distributed under permissive open licenses (CC0, CC BY 4.0, MIT, or Open Data).
2. **Packaged locally within the repository** under `team/data/reference_traces/` to guarantee **100% offline, reproducible, and unattended evaluation** by the Zhinaushy auto-agent in an isolated virtual machine without internet dependencies.
3. **Down-sampled and transformed** into deterministic 1,500-step time-series slices (totaling 263 KB) that feed the **Trace-Driven Simulation** engine (`simulator.py`) using the *Replay + Physics* pattern.

---

## 2. Inventory of Reference Datasets & Applied Transforms

| Dataset Title & Domain | Source / Repository | Official Contest Citation | License | Applied Transformation & Down-Sampling | Connected Digital Twins & Modules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Quality Prediction in a Mining Process** *(Flotation Plant Dynamics)* | Kaggle / Eduardo Magalhães | [`/ru/data/`](https://openegiz-contest.github.io/ru/data/) *(Item 1)* | **CC0: Public Domain** | 1,500 continuous 1-second process steps of feed silica (% SiO2), iron grade (% Fe), reagent flow rates, pulp density, and pH. Stored in `team/data/reference_traces/flotation_plant_trace.csv`. | `sag-mill-01`, `grade_blending_controller.py` *(EKF grade innovation & Cu recovery)* |
| **Energy Consumption of Mining and Processing Plant** *(Power Grid & Substation)* | Zenodo (Record 20647907) & UCI Machine Learning | [`/ru/data/`](https://openegiz-contest.github.io/ru/data/) *(Item 7)* | **CC BY 4.0** | 1,500 1-second steps of substation base industrial electrical load, grid frequency fluctuations, and power factor. Stored in `team/data/reference_traces/grid_energy_trace.csv`. | `substation-01`, `trolley_energy_manager.py` *(1200V DC catenary & 2 MWh BESS peak shaving)* |
| **Seismic Bumps Dataset & MWD Hard Rock Drilling** *(Geomechanics & Slope Stability)* | UCI ML Repository (Record 266) & Zenodo (Record 10358374) | [`/ru/data/`](https://openegiz-contest.github.io/ru/data/) *(Items 3 & 5)* | **CC BY 4.0** | 1,500 steps of microseismic pulse rate, energy dissipation, blast Peak Particle Velocity (PPV), and MWD Specific Energy of Drilling (SED). Stored in `team/data/reference_traces/seismic_geotech_trace.csv`. | `slope-radar-01`, `drill-rig-01` *(Mohr-Coulomb FoS & Drill-to-Mill Bond index)* |
| **Mine Atmosphere & Gas Sensor Array** *(Pit Microclimate & Dust Plumes)* | Mendeley Data & SRTM OpenData KZ | [`/ru/data/`](https://openegiz-contest.github.io/ru/data/) *(Item 2)* | **CC BY 4.0** | 1,500 steps of ambient PM10, PM2.5 dust, diesel CO and NOx exhaust concentrations, and ambient wind speed. Stored in `team/data/reference_traces/mine_atmosphere_trace.csv`. | `bench-north`, `bench-south`, `water-bowser-01` *(Autonomous dust spray dispatch)* |
| **OpenMines: North Pit Mine Dispatch Model** *(Haulage Truck Fleet Calibration)* | GitHub / OpenMines (`north_pit_mine.json`) | [`/ru/data/`](https://openegiz-contest.github.io/ru/data/) *(Item 9)* | **MIT License** | Haul route link coordinates, truck cycle times, and crusher dump pocket queueing structure. Incorporated into `team/data/mine_spatial_topology.geojson`. | `truck-01` .. `truck-08`, `crusher-01` |
| **LiDAR DEM Pit Topography** *(3D Surface Model)* | SRTM-30 / OpenTopography & Synthetic Porphyry Pit | Rule 6.8 compliant | **CC BY 4.0** | TIN triangulated irregular network (100 elevation contours, 4,500 m2 sump basin). Stored in `team/data/pit_lidar_dem.json`. | All 24 Digital Twins spatial coordinates |

---

## 3. Attribution & Citation Statements

1. **Magalhães, E. (2020).** *Quality Prediction in a Mining Process.* Kaggle Dataset. CC0 Public Domain.  
   *Modifications:* Extracted 1,500 consecutive observations of flotation cell columns, normalized silica/iron fluctuations to feed grade noise for Smart-Kenish Kalman filtering.
2. **Sikora, M. et al. (2013).** *Seismic Bumps Dataset.* UCI Machine Learning Repository. CC BY 4.0.  
   *Modifications:* Temporal sampling of geophone pulse rates and seismic energy events applied as seismic vibration stress perturbations $\Delta\tau_{dyn}$ on open-pit bench wedge equilibrium.
3. **Zenodo Mining Energy Consortium (2021).** *Energy consumption data of a mining and processing plant.* Zenodo Record 20647907. CC BY 4.0.  
   *Modifications:* Extracted active and reactive industrial load profile, rescaled to 6 MW traction substation base demand with 2 MWh BESS shaving.
4. **Norwegian Tunneling Society & Zenodo (2023).** *MWD dataset, 15 Norwegian hard rock tunnels.* Zenodo Record 10358374. CC BY 4.0.  
   *Modifications:* Specific Energy of Drilling (SED) mapped to Protodyakonov rock strength $f$ and Bond Work Index $W_i(t) \in [13.8, 15.2]\text{ kWh/t}$.

---

## 4. Software License Interoperability
- The Smart-Kenish source code and mathematical modules are released under the **MIT License** (see [`LICENSE`](../../LICENSE)).
- In accordance with Rule 6.11, the underlying reference data files maintain their respective **CC0 / CC BY 4.0 / MIT** licenses.
- No confidential, proprietary, or personal data (PII) is included or required.
