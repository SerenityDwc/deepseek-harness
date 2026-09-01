#!/usr/bin/env python3
"""VoltCell v5.1 电芯设计工程计算（完整参数集，按 BDA1.0-2.0 设计 Know-how）。
用法: python script.py '<json>' → stdout 输出 JSON。
输入:
  capacityAh, chemistry(LFP|NMC|LMO), formFactor(pouch|cylindrical|prismatic),
  targetDensityWhKg, weightLimitG, dimensions[L,W,T]mm,
  engineering: 41 项设计输入（配方/极片/JR/隔膜/电解液/铝塑膜/电池信息/壳体），可部分提供（缺省用默认）
  knowledge_params: { voltage, density, cycle }（知识库覆盖）
输出: 设计容量/能量/重量(分项)/密度/寿命 + params41（41项输入+来源）+ target_check。
"""
import json
import sys

# ---- 内置默认值表（按 Know-how 取值范围；知识库命中时覆盖）----
FORM_FACTOR = {"pouch": 0.92, "cylindrical": 0.85, "prismatic": 0.88}
PACK_WEIGHT_RATIO = {"pouch": 0.10, "cylindrical": 0.18, "prismatic": 0.22}

# 41 项默认（按 BDA1.0-2.0 设计表实测值校准：80Ah 软包 + 280Ah 方形；化学体系相关在 CHEM_PARAMS）
DEFAULTS41 = {
    # 正极配方
    'cathode_formula_ratio': 0.955, 'cathode_density': 3.6,
    # 正极片（80Ah 表实测：克容量145/面密度385/压实2.4/长232/宽204/延展0.008/反弹0.02/0.055）
    'cathode_capacity': 145, 'cathode_load': 385, 'cathode_compaction': 2.4,
    'cathode_length': 232, 'cathode_width': 204, 'cathode_extension': 0.008,
    'cathode_rebound_empty': 0.02, 'cathode_rebound_full': 0.055,
    # 正极 Al 基材（80Ah：面密度35.1 g/m²，厚度13µm）
    'cathode_foil_density': 35.1, 'cathode_foil_thickness': 0.013,
    # 负极配方（80Ah：活性0.957/水性粘结剂0.02/SBR0.005/CMC0.005）
    'anode_formula_ratio': 0.957, 'anode_density': 2.2,
    # 负极片（80Ah：克容量350/压实1.55/延展0.001/反弹0.08/0.3；Cu基材面密度53.4/厚6µm）
    'anode_capacity': 350, 'anode_compaction': 1.55, 'anode_extension': 0.001,
    'anode_rebound_empty': 0.08, 'anode_rebound_full': 0.3,
    'anode_foil_density': 53.4, 'anode_foil_thickness': 0.006,
    'anode_tab_L': 44, 'anode_tab_H': 13.5,
    # 正极 Tab（80Ah：Tab-W44/Tab-H12）
    'cathode_tab_W': 44, 'cathode_tab_H': 12,
    # J/R（80Ah：正极层数33，错位：负极vs正极 H1.5/W1.5，隔膜vs负极 H2/W1）
    'jr_layers': 33, 'jr_neg_vs_pos_H': 1.5, 'jr_neg_vs_pos_W': 1.5,
    'jr_sep_vs_neg_H': 2, 'jr_sep_vs_neg_W': 1,
    # 隔膜（80Ah：面密度10.5/厚度16µm/孔隙率0.4）
    'sep_density': 10.5, 'sep_thickness': 0.016, 'sep_porosity': 0.4,
    # 电解液（80Ah：密度1.228/余量系数1.71）
    'elec_density': 1.228, 'elec_margin': 1.71,
    # 铝塑膜（80Ah：面密度222/厚度152µm/入壳比默认1.0）
    'pouch_density': 222, 'pouch_thickness': 0.152, 'pouch_inner_ratio': 1.0,
    # 电池信息（容量/电压按输入；此处占位由 CHEM_PARAMS/输入覆盖）
    'target_capacity': 80, 'nominal_voltage': 3.2,
    # 铝塑膜尺寸（同铝塑膜）
    'pouch2_density': 222, 'pouch2_thickness': 0.152,
    # 壳体尺寸（280Ah 方形：宽173/壁厚2mm/内径71.25mm）
    'case_width': 173, 'case_wall': 2.0, 'case_inner_diameter': 71.25,
}
CHEM_PARAMS = {
    'LFP': {'cathode_capacity': 145, 'cathode_load': 385, 'nominal_voltage': 3.2, 'cycle': 3500},
    'NMC': {'cathode_capacity': 165, 'cathode_load': 350, 'nominal_voltage': 3.65, 'cycle': 2000},
    'LMO': {'cathode_capacity': 120, 'cathode_load': 300, 'nominal_voltage': 3.8, 'cycle': 800},
}

# 11 节 → 参数键
SECTIONS = [
    ('正极配方', ['cathode_formula_ratio', 'cathode_density']),
    ('正极片', ['cathode_capacity', 'cathode_load', 'cathode_compaction', 'cathode_length', 'cathode_width', 'cathode_extension', 'cathode_rebound_empty', 'cathode_rebound_full', 'cathode_foil_density', 'cathode_foil_thickness', 'cathode_tab_W', 'cathode_tab_H']),
    ('负极配方', ['anode_formula_ratio', 'anode_density']),
    ('负极片', ['anode_capacity', 'anode_compaction', 'anode_extension', 'anode_rebound_empty', 'anode_rebound_full', 'anode_foil_density', 'anode_foil_thickness', 'anode_tab_L', 'anode_tab_H']),
    ('J/R', ['jr_layers', 'jr_neg_vs_pos_H', 'jr_neg_vs_pos_W', 'jr_sep_vs_neg_H', 'jr_sep_vs_neg_W']),
    ('隔膜', ['sep_density', 'sep_thickness', 'sep_porosity']),
    ('电解液', ['elec_density', 'elec_margin']),
    ('铝塑膜', ['pouch_density', 'pouch_thickness', 'pouch_inner_ratio']),
    ('电池信息', ['target_capacity', 'nominal_voltage']),
    ('铝塑膜尺寸', ['pouch2_density', 'pouch2_thickness']),
    ('壳体尺寸', ['case_width', 'case_wall', 'case_inner_diameter']),
]


def main(argv):
    if len(argv) < 1:
        print(json.dumps({"error": "missing args"}), file=sys.stderr)
        return 2
    try:
        data = json.loads(argv[0])
        cap = float(data["capacityAh"])
        chem_name = str(data["chemistry"])
        ff = str(data["formFactor"])

        # ---- 41 项参数（化学体系默认 → 全局默认 → engineering 覆盖 → 知识库覆盖）----
        p41 = dict(DEFAULTS41)
        p41.update(CHEM_PARAMS.get(chem_name, {}))
        eng = data.get("engineering") or {}
        src = {}  # 来源：default / user / knowledge
        for k in p41:
            src[k] = 'default'
        for section in eng.values():
            if isinstance(section, dict):
                for k, v in section.items():
                    if k in p41:
                        p41[k] = float(v)
                        src[k] = 'user'
        kp = data.get("knowledge_params") or {}
        if isinstance(kp, dict):
            if 'voltage' in kp: p41['nominal_voltage'] = float(kp['voltage']); src['nominal_voltage'] = 'knowledge'
            if 'cycle' in kp: p41['cycle'] = float(kp['cycle']); src['cycle'] = 'knowledge'
            if 'density' in kp:
                # 知识库体系密度 → 用于能量密度参照（非 41 项）
                p41['kb_density'] = float(kp['density']); src['kb_density'] = 'knowledge'
        used_kb = any(s == 'knowledge' for s in src.values())

        target_density = float(data.get("targetDensityWhKg") or 0)
        weight_limit = float(data.get("weightLimitG") or 0)
        margin = float(data.get("capacityMargin") or 0.0326)

        # ---- 计算 ----
        design_cap = cap * (1 + margin)
        voltage = p41['nominal_voltage']
        energy = design_cap * voltage

        cathode_capacity = p41['cathode_capacity']
        cathode_active_mass_g = design_cap * 1000 / cathode_capacity
        cathode_electrode_g = cathode_active_mass_g / p41['cathode_formula_ratio']
        anode_active_mass_g = design_cap * 1000 / p41['anode_capacity'] * 1.15
        anode_electrode_g = anode_active_mass_g / p41['anode_formula_ratio']
        cathode_area_m2 = cathode_active_mass_g / 1000 / p41['cathode_load'] if p41['cathode_load'] else 0
        sep_mass_g = cathode_area_m2 * 2 * p41['sep_density']
        electrolyte_g = (cathode_active_mass_g + anode_active_mass_g) * p41['elec_margin'] / 10
        core_g = cathode_electrode_g + anode_electrode_g + sep_mass_g
        pack_g = core_g * PACK_WEIGHT_RATIO[ff]
        weight_g = core_g + electrolyte_g + pack_g

        energy_density = energy / (weight_g / 1000)
        vol_density = 0.0
        dims = data.get("dimensions") or {}
        if dims.get("L") and dims.get("W") and dims.get("T"):
            vol = float(dims["L"]) / 1000 * float(dims["W"]) / 1000 * float(dims["T"]) / 1000
            if vol > 0: vol_density = energy / vol / 1000

        result = {
            "design_capacity_Ah": round(design_cap, 2),
            "energy_Wh": round(energy, 2),
            "nominal_voltage_V": voltage,
            "weight_g": round(weight_g, 1),
            "energy_density_Wh_kg": round(energy_density, 1),
            "volumetric_density_Wh_L": round(vol_density, 1),
            "cycle_life": int(p41.get('cycle', CHEM_PARAMS[chem_name]['cycle'])),
            "source": "knowledge" if used_kb else "builtin",
            "params41": {
                "sections": [
                    {"name": n, "items": [{"key": k, "value": p41[k], "source": src.get(k, 'default')} for k in keys]}
                    for n, keys in SECTIONS
                ]
            },
            "detail": {
                "cathode_active_mass_g": round(cathode_active_mass_g, 1),
                "cathode_electrode_g": round(cathode_electrode_g, 1),
                "anode_electrode_g": round(anode_electrode_g, 1),
                "separator_g": round(sep_mass_g, 1),
                "electrolyte_g": round(electrolyte_g, 1),
                "pack_parts_g": round(pack_g, 1),
            },
            "target_check": {
                "target_density_Wh_kg": target_density,
                "density_met": (energy_density >= target_density) if target_density > 0 else None,
                "weight_limit_g": weight_limit,
                "weight_met": (weight_g <= weight_limit) if weight_limit > 0 else None,
            },
        }
        print(json.dumps(result))
        return 0
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        print(json.dumps({"error": f"bad input: {exc}"}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
