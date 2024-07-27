package tree_sitter_vrl_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/belltoy/tree-sitter-vrl"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_vrl.Language())
	if language == nil {
		t.Errorf("Error loading VRL grammar")
	}
}
