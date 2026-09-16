/*
  Same tradeoff notes as the Python version: Postgres holds case/user
  records (fixed relational shape); Neo4j holds CITES/RELATED_TO/OVERRULES
  edges between cases, because multi-hop precedent traversal is a graph
  problem that gets awkward as a recursive SQL CTE once hop depth grows.
  Be ready to say when this ISN'T worth it: for a small case corpus, a
  recursive CTE in Postgres alone would work fine — the graph DB earns its
  operational cost only once traversal depth/fanout gets large.
*/
import neo4j, { Driver } from "neo4j-driver";
import { config } from "../core/config.js";

const driver: Driver = neo4j.driver(
  config.neo4jUri,
  neo4j.auth.basic(config.neo4jUser, config.neo4jPassword)
);

const ALLOWED_RELATIONSHIPS = new Set(["CITES", "RELATED_TO", "OVERRULES"]);

export async function createCaseNode(caseId: string, title: string): Promise<void> {
  const session = driver.session();
  try {
    await session.run(
      "MERGE (c:Case {id: $caseId}) SET c.title = $title",
      { caseId, title }
    );
  } finally {
    await session.close();
  }
}

export async function linkCases(
  fromCaseId: string,
  toCaseId: string,
  relationship: string = "CITES"
): Promise<void> {
  // Neo4j doesn't support parameterizing relationship TYPES (only property
  // values), so the type is interpolated into the query string. NEVER do
  // this with a raw, unvalidated user string — that's a Cypher injection
  // vector, exactly like unsanitized SQL string concatenation. The
  // allow-list check below is what makes this safe.
  if (!ALLOWED_RELATIONSHIPS.has(relationship)) {
    throw new Error(`relationship must be one of ${[...ALLOWED_RELATIONSHIPS].join(", ")}`);
  }

  const session = driver.session();
  try {
    await session.run(
      `MATCH (a:Case {id: $fromId}), (b:Case {id: $toId}) MERGE (a)-[:${relationship}]->(b)`,
      { fromId: fromCaseId, toId: toCaseId }
    );
  } finally {
    await session.close();
  }
}

export async function findRelatedCases(
  caseId: string,
  maxHops: number = 2
): Promise<Array<{ id: string; title: string }>> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (start:Case {id: $caseId})-[*1..${maxHops}]-(related:Case) ` +
        "RETURN DISTINCT related.id AS id, related.title AS title",
      { caseId }
    );
    return result.records.map((r) => ({ id: r.get("id"), title: r.get("title") }));
  } finally {
    await session.close();
  }
}

export async function closeGraphDriver(): Promise<void> {
  await driver.close();
}
