/*
GET /problems

query parameters:
username (required): the username to fetch the problems for
*/

import assert from "assert";
import { Request, Response } from "express";

import { Problem } from "../common/interfaces";
import { TAGS } from "../tags";
import { User } from "../models/User";
import { getProblemsSolvedAc } from "../platforms/boj/problems";
import { getUserSolves } from "../platforms/boj/user";
import { randInt } from "../util/random";

export const problemsGet = async (
  req: Request,
  res: Response
): Promise<void> => {
  const username = req.query.username as string;

  const user = await User.findOne({ username });
  assert(user);
  console.log(user);
  if (!user.boj.userId) {
    res.status(401).send({ ok: false, message: "BOJ handle not set" });
    return;
  }

  const solves = await getUserSolves(user.boj.userId);

  // TODO: make sure each problem appears in <= 1 set
  const problemSets: [string, Problem[]][] = [];
  for (let tag = 0; tag < 4; tag++) {
    const mid = user.boj.levels[tag];
    const forTag: Problem[] = [];
    for (let tier = mid - 2; tier <= mid + 2; tier++) {
      const queryParts = [
        `tag:${TAGS[tag].solvedName}`,
        `tier:${tier}`,
        `!solved_by:${user.boj.userId}`,
        "solvable:true",
        "average_try:..5", // not too many tries needed to solve
        "solved:25..", // at least 25 people solved
      ];
      const query = queryParts.join(" ");
      const problemsFromSolved = await getProblemsSolvedAc(query);
      const english = problemsFromSolved.filter((problem) => {
        // keep only the problems whose titles are entirely alphanumeric
        // to increase the chance of English
        return /^[a-z ]*$/i.test(problem.titleKo);
        // TODO: query problems from acmicpc.net and use ML to check if it's in English!
      });
      const count = english.length;
      assert(count > 0);
      const p = english[randInt(0, count - 1)];
      forTag.push({
        id: p.problemId.toString(),
        title: p.titleKo,
        tier,
        solved: solves.accepted.includes(p.problemId.toString()),
      });
    }
    problemSets.push([TAGS[tag].displayName, forTag]);
  }
  console.log(problemSets);
  res.status(200).send({ problemSets });
};
