# Quickstart Validation: Learner Sentence Timeline

## Validation Scenarios

### Scenario 1: Multi-Student Timeline Loading
1. Open the "Reports & History" tab.
2. Select a room/session with multiple active students (e.g. from historical list).
3. Verify that the "Learner Sentence Timeline — CPD by sentence point" chart loads.
4. Verify that up to 10 lines of different colors are drawn, with a legend below displaying the names of the learners.

### Scenario 2: X-Axis Sorting Verification
1. Click the "Sort X" dropdown.
2. Select "CVR Ω ascending".
   - Verify that the X-axis updates and labels begin with "Ω".
   - Verify that the lines and nodes are re-sorted ascending by CVR values.
3. Select "CCI Standard X ascending".
   - Verify that the X-axis updates and labels begin with "X".
   - Verify that the lines are re-sorted ascending by CCI values.
4. Select "Round / time order".
   - Verify that the points return to the sequential round index ordering.

### Scenario 3: Hover Tooltip inspection
1. Hover your mouse pointer over any vertex/node on any student's line.
2. Check that the tooltip appears showing:
   - Learner Name
   - Sentence Code
   - Round Number
   - CPD value (with "V" unit)
   - CVR value (with "Ω" prefix)
   - CCI card value (with "X" and "Y" coordinates)
   - Performance Grade (Red/Yellow/Green/Purple)
