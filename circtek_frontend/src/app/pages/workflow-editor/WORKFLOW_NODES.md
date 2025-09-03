# Workflow Editor Nodes Documentation

This document provides details about the different types of nodes available in the workflow editor. Each node has a unique ID, a display name (label), and one or more output edges that determine the flow of the workflow.

## Node Types

There are four main categories of nodes:

1.  **Standard Nodes**: These nodes perform a single action and have one output.
2.  **Decision Nodes**: These nodes represent a point where the workflow branches based on a "Pass" or "Fail" condition. They have two outputs.
3.  **Yes/No Decision Nodes**: Similar to Decision Nodes, but the branches are based on a "Yes" or "No" condition. They have two outputs.
4.  **Triple Decision Nodes**: These nodes are used for more complex branching with three possible outcomes.

---

## 1. Standard Nodes

Standard nodes have a single input and a single output edge.

| ID                  | Name                         | Out Edges |
| :------------------ | :--------------------------- | :-------- |
| `connect_iphone`    | Start: Connect iPhone        | 1 (`out`) |
| `connect_airpod`    | Start: Connect Airpod        | 1 (`out`) |
| `disconnect_airpod` | Disconnect Airpod            | 1 (`out`) |
| `activate_device`   | Activate the device          | 1 (`out`) |
| `push_wifi`         | Push a WiFi profile          | 1 (`out`) |
| `erase_device`      | Erase the device             | 1 (`out`) |
| `restore`           | Restore                      | 1 (`out`) |
| `restore_keep_data` | Restore (Keep customer data) | 1 (`out`) |
| `manual_input_lpn`  | Manual Input: LPN            | 1 (`out`) |

### Label Nodes (Dynamic)

Label nodes are a special type of standard node generated dynamically based on the available documents (labels) for a client.

| ID                 | Name                        | Out Edges |
| :----------------- | :-------------------------- | :-------- |
| `print_label_{id}` | Print label: "{label_name}" | 1 (`out`) |

---

## 2. Decision Nodes

Decision nodes have one input and two output edges: `Pass` and `Fail`.

| ID                   | Name        | Out Edges                  |
| :------------------- | :---------- | :------------------------- |
| `airpods_audio_test` | Audio Test  | 2 (`out_pass`, `out_fail`) |
| `start_test`         | Start Test  | 2 (`out_pass`, `out_fail`) |
| `use_app`            | Use the app | 2 (`out_pass`, `out_fail`) |

---

## 3. Yes/No Decision Nodes

These nodes have one input and two output edges: `Yes` and `No`.

| ID                    | Name                     | Out Edges               |
| :-------------------- | :----------------------- | :---------------------- |
| `airpdo_oem_decision` | OEM                      | 2 (`out_yes`, `out_no`) |
| `check_restore_mode`  | Check if in restore mode | 2 (`out_yes`, `out_no`) |

---

## 4. Triple Decision Nodes

These nodes have one input and three output edges for more complex conditions.

| ID                | Name            | Out Edges                                   |
| :---------------- | :-------------- | :------------------------------------------ |
| `check_if_locked` | Check If Locked | 3 (`out_unlocked`, `out_icloud`, `out_mdm`) |
