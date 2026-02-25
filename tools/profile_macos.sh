#!/bin/bash
# macOS Memory Profiling Script for Chrome Scraper
# Demonstrates using leaks, footprint, and Instruments

set -e

SCRAPER_PID=""
CHROME_PIDS=()
OUTPUT_DIR="./profiling-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$OUTPUT_DIR"

echo "================================================"
echo "  macOS Chrome Scraper Memory Profiler"
echo "================================================"
echo ""

# Function to get Chrome renderer PIDs
find_chrome_pids() {
    echo "🔍 Finding Chrome processes..."
    CHROME_PIDS=($(pgrep -f "Chrome Helper.*Renderer" || true))

    if [ ${#CHROME_PIDS[@]} -eq 0 ]; then
        echo "⚠️  No Chrome renderer processes found"
        echo "   Make sure to start the scraper first!"
        return 1
    fi

    echo "✅ Found ${#CHROME_PIDS[@]} Chrome renderer process(es):"
    for pid in "${CHROME_PIDS[@]}"; do
        local name=$(ps -p $pid -o comm=)
        local mem=$(ps -p $pid -o rss= | awk '{print $1/1024 " MB"}')
        echo "   PID $pid: $name ($mem)"
    done
    echo ""
}

# Function to run leaks command
run_leaks() {
    local pid=$1
    local output="$OUTPUT_DIR/leaks_${TIMESTAMP}_pid${pid}.txt"

    echo "🔍 Running leaks on PID $pid..."
    echo "   Output: $output"

    # leaks can take a while, so run in background
    leaks $pid > "$output" 2>&1 &

    # Parse the output for leak summary
    sleep 2
    if [ -f "$output" ]; then
        echo "   Leak summary:"
        grep -E "(leaks|Process|total)" "$output" | head -20 || true
    fi

    echo ""
}

# Function to run footprint
run_footprint() {
    local pid=$1
    local output="$OUTPUT_DIR/footprint_${TIMESTAMP}_pid${pid}.txt"

    echo "🔍 Running footprint on PID $pid..."
    echo "   Output: $output"

    if command -v footprint &> /dev/null; then
        sudo footprint -swappable $pid > "$output" 2>&1
        echo "   Footprint analysis:"
        cat "$output" | head -30
    else
        echo "   ⚠️  footprint not found (Xcode 13+ required)"
    fi

    echo ""
}

# Function to run vmmap
run_vmmap() {
    local pid=$1
    local output="$OUTPUT_DIR/vmmap_${TIMESTAMP}_pid${pid}.txt"

    echo "🔍 Running vmmap on PID $pid..."
    echo "   Output: $output"

    vmmap $pid > "$output" 2>&1

    echo "   Region summary:"
    grep -E "(Region|Total|Writable)" "$output" | head -20 || true

    echo ""
}

# Function to monitor memory over time
monitor_memory() {
    local duration=${1:-60}  # Default 60 seconds
    local interval=${2:-5}   # Default 5 seconds
    local output="$OUTPUT_DIR/memory_monitor_${TIMESTAMP}.csv"

    echo "📊 Monitoring memory for ${duration}s (interval: ${interval}s)..."
    echo "   Output: $output"

    echo "Timestamp,PID,RSS_MB,VSZ_MB,CPU_%" > "$output"

    local end_time=$(($(date +%s) + duration))

    while [ $(date +%s) -lt $end_time ]; do
        local timestamp=$(date +"%Y-%m-%d %H:%M:%S")

        for pid in "${CHROME_PIDS[@]}"; do
            if ps -p $pid > /dev/null 2>&1; then
                local stats=$(ps -p $pid -o rss=,vsz=,%cpu= | awk '{print $1/1024 "," $2/1024 "," $3}')
                echo "${timestamp},${pid},${stats}" >> "$output"
            fi
        done

        sleep $interval
    done

    echo "✅ Monitoring complete"
    echo ""
}

# Function to open Instruments template
open_instruments() {
    echo "🔧 Opening Instruments..."
    echo "   Template: Allocations"
    echo ""

    if [ -d "/Applications/Xcode.app" ]; then
        # Open Instruments with Allocations template
        open -a "Instruments" -t "Allocations"

        echo "✅ Instruments opened"
        echo ""
        echo "📋 Instructions:"
        echo "   1. In Instruments, click 'Choose Target'"
        echo "   2. Select 'Attach to Process'"
        echo "   3. Find and select a Chrome Helper (Renderer) process"
        echo "   4. Click 'Record' (red circle)"
        echo "   5. Run your scraper in another terminal"
        echo "   6. Use 'Mark Generation' during recording"
        echo "   7. Stop and analyze results"
        echo ""
    else
        echo "⚠️  Xcode not found"
        echo "   Install from: https://developer.apple.com/xcode/"
        echo ""
    fi
}

# Function to show memory summary
show_summary() {
    echo "================================================"
    echo "  Memory Summary"
    echo "================================================"
    echo ""

    for pid in "${CHROME_PIDS[@]}"; do
        if ps -p $pid > /dev/null 2>&1; then
            local rss=$(ps -p $pid -o rss= | awk '{print $1/1024}')
            local vsz=$(ps -p $pid -o vsz= | awk '{print $1/1024}')
            local cpu=$(ps -p $pid -o %cpu=)
            local name=$(ps -p $pid -o comm=)

            echo "PID: $pid"
            echo "  Name: $name"
            echo "  RSS:  ${rss} MB (physical memory)"
            echo "  VSZ:  ${vsz} MB (virtual memory)"
            echo "  CPU:  ${cpu}%"
            echo ""
        fi
    done
}

# Function to run zprint (kernel zones)
run_zprint() {
    local output="$OUTPUT_DIR/zprint_${TIMESTAMP}.txt"

    echo "🔍 Running zprint (kernel zone analysis)..."
    echo "   Output: $output"

    if command -v zprint &> /dev/null; then
        sudo zprint -ar | head -n 20 > "$output"
        cat "$output"
    else
        echo "   ⚠️  zprint not found (requires kernel debugging mode)"
    fi

    echo ""
}

# Main menu
show_menu() {
    echo "================================================"
    echo "  Profiling Options"
    echo "================================================"
    echo ""
    echo "1) Find Chrome processes"
    echo "2) Run leaks detector"
    echo "3) Run footprint analysis"
    echo "4) Run vmmap analysis"
    echo "5) Monitor memory over time"
    echo "6) Open Instruments (GUI)"
    echo "7) Run zprint (kernel zones)"
    echo "8) Show memory summary"
    echo "9) Run all non-GUI tools"
    echo "0) Exit"
    echo ""
}

# Main loop
main() {
    echo "Chrome Scraper Memory Profiler"
    echo ""
    echo "Make sure your scraper is running before profiling!"
    echo ""

    while true; do
        show_menu
        read -p "Select option: " choice

        case $choice in
            1) find_chrome_pids ;;
            2)
                find_chrome_pids || continue
                for pid in "${CHROME_PIDS[@]}"; do
                    run_leaks $pid
                done
                ;;
            3)
                find_chrome_pids || continue
                for pid in "${CHROME_PIDS[@]}"; do
                    run_footprint $pid
                done
                ;;
            4)
                find_chrome_pids || continue
                for pid in "${CHROME_PIDS[@]}"; do
                    run_vmmap $pid
                done
                ;;
            5)
                find_chrome_pids || continue
                read -p "Duration (seconds, default 60): " duration
                read -p "Interval (seconds, default 5): " interval
                monitor_memory "${duration:-60}" "${interval:-5}"
                ;;
            6) open_instruments ;;
            7) run_zprint ;;
            8)
                find_chrome_pids || continue
                show_summary
                ;;
            9)
                find_chrome_pids || continue
                echo "Running all profiling tools..."
                for pid in "${CHROME_PIDS[@]}"; do
                    echo "Processing PID $pid..."
                    run_leaks $pid
                    run_footprint $pid
                    run_vmmap $pid
                done
                run_zprint
                show_summary
                ;;
            0) echo "Goodbye!"; exit 0 ;;
            *) echo "Invalid option" ;;
        esac

        read -p "Press Enter to continue..."
        clear
    done
}

# Check if running with arguments
if [ $# -gt 0 ]; then
    case "$1" in
        --find) find_chrome_pids ;;
        --leaks)
            find_chrome_pids || exit 1
            for pid in "${CHROME_PIDS[@]}"; do run_leaks $pid; done
            ;;
        --footprint)
            find_chrome_pids || exit 1
            for pid in "${CHROME_PIDS[@]}"; do run_footprint $pid; done
            ;;
        --monitor)
            find_chrome_pids || exit 1
            monitor_memory "${2:-60}" "${3:-5}"
            ;;
        --instruments) open_instruments ;;
        --all)
            find_chrome_pids || exit 1
            for pid in "${CHROME_PIDS[@]}"; do
                run_leaks $pid
                run_footprint $pid
                run_vmmap $pid
            done
            run_zprint
            show_summary
            ;;
        *)
            echo "Usage: $0 [--find|--leaks|--footprint|--monitor|--instruments|--all]"
            echo ""
            echo "  --find       Find Chrome processes"
            echo "  --leaks      Run leaks detector"
            echo "  --footprint  Run footprint analysis"
            echo "  --monitor    Monitor memory over time"
            echo "  --instruments Open Instruments GUI"
            echo "  --all        Run all tools"
            exit 1
            ;;
    esac
else
    main
fi
