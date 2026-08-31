#!/usr/bin/env bash
set -euo pipefail

# One command for the operational chain requested by owner UAT.
bash scripts/run-assortment-browser-qa-v170.sh
bash scripts/run-procurement-browser-qa-v190.sh
bash scripts/run-menu-sale-size-browser-qa-v298.sh

for scenario in warehouse-nomenclature menu-tech-cards suppliers-purchases; do
  BD_QA_PROFILE=iphone-13 BD_QA_SCENARIO="$scenario" \
    bash scripts/run-mobile-navigation-qa-v269.sh
done

