import { StyleSheet } from "react-native"

export const OVERLAY_COLOR = "rgba(0, 0, 0, 0.5)"

export const infoModalStyles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  container: {
    borderRadius: 12,
    margin: 20,
    maxHeight: "80%",
    padding: 0,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },
  listItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: OVERLAY_COLOR,
    flex: 1,
    justifyContent: "center",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
})
